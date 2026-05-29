import { resolveProductAssets } from "@/lib/productWhatsApp";

type WhatsAppInquiry = {
  id: string;
  companyName: string;
  contactName: string;
  phone: string | null;
  product: string;
  productNotes?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  source?: string | null;
};

type SendWhatsBoostMessageInput = {
  to: string;
  message: string;
};

// WhatsBoost media types. Verify these param names against your WhatsBoost
// account's API docs when you wire in real assets (see MEDIA_PARAMS below).
type WhatsBoostMediaType = "image" | "document" | "video" | "audio";

type SendWhatsBoostMediaInput = {
  to: string;
  mediaUrl: string;
  mediaType: WhatsBoostMediaType;
  caption?: string;
};

type WhatsBoostResult =
  | { ok: true; providerMessageId?: string; response: unknown }
  | { ok: false; error: string; response?: unknown };

const DEFAULT_BASE_URL = "https://whatsboost.net";
const DEFAULT_COUNTRY_CODE = "91";

export function isWhatsBoostConfigured() {
  return Boolean(process.env.WHATSBOOST_API_KEY);
}

export function normalizeWhatsAppPhone(phone?: string | null) {
  if (!phone) return "";
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (hasPlus) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.length === 10) return `${process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? DEFAULT_COUNTRY_CODE}${digits}`;
  return digits;
}

function quantityText(inquiry: WhatsAppInquiry) {
  if (!inquiry.quantity) return "";
  return ` for ${inquiry.quantity} ${inquiry.quantityUnit ?? ""}`.trimEnd();
}

export function newLeadWhatsAppMessage(inquiry: WhatsAppInquiry) {
  const assets = resolveProductAssets(inquiry.product);
  const productNote = inquiry.productNotes ? `\n\nRequirement noted: ${inquiry.productNotes}` : "";
  // What we'll attach after the text, phrased so the message matches reality.
  const attachmentLine =
    assets.images.length && assets.brochureUrl
      ? "We've shared product photos and our brochure below."
      : assets.images.length
        ? "We've shared product photos below."
        : assets.brochureUrl
          ? "We've shared our product brochure below."
          : `You can review our product details here: ${process.env.NEXT_PUBLIC_BROCHURE_URL ?? "https://azaterra.com/"}`;
  return [
    `Hello ${inquiry.contactName},`,
    "",
    `Thank you for your inquiry about ${inquiry.product}${quantityText(inquiry)} with Azaterra Crop Science.`,
    "",
    assets.blurb,
    productNote ? productNote.trimStart() : "",
    "",
    attachmentLine,
    "",
    "Please share your required specification, quantity, packaging, and delivery location so our team can assist quickly.",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === "")) // collapse double blank lines
    .join("\n");
}

// Shared low-level POST to WhatsBoost. Builds the auth params, sends the form,
// and normalizes the response into a WhatsBoostResult.
async function postToWhatsBoost(extraFields: Record<string, string>): Promise<WhatsBoostResult> {
  const secret = process.env.WHATSBOOST_API_KEY;
  if (!secret) return { ok: false, error: "WHATSBOOST_API_KEY is not configured." };

  const baseUrl = (process.env.WHATSBOOST_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const url = `${baseUrl}/api/send/whatsapp`;
  const form = new URLSearchParams();
  form.set("secret", secret);
  const account = process.env.WHATSBOOST_ACCOUNT_ID;
  if (account) form.set("account", account);
  for (const [k, v] of Object.entries(extraFields)) form.set(k, v);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as unknown;
    const providerStatus =
      data && typeof data === "object" && "status" in data ? Number((data as { status?: unknown }).status) : null;
    if (!res.ok || (providerStatus !== null && providerStatus >= 400)) {
      const providerMessage =
        data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : `WhatsBoost returned ${res.status}`;
      return { ok: false, error: providerMessage, response: data };
    }
    const providerMessageId =
      data && typeof data === "object" && "data" in data
        ? String((data as { data?: { id?: unknown; message_id?: unknown } }).data?.id ?? (data as { data?: { message_id?: unknown } }).data?.message_id ?? "")
        : "";
    return {
      ok: true,
      providerMessageId: providerMessageId || undefined,
      response: data,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "WhatsBoost request failed." };
  }
}

export async function sendWhatsBoostMessage({
  to,
  message,
}: SendWhatsBoostMessageInput): Promise<WhatsBoostResult> {
  const phone = normalizeWhatsAppPhone(to);
  if (!phone) return { ok: false, error: "Customer phone number is missing or invalid." };

  return postToWhatsBoost({ phone, type: "text", message });
}

// Sends a single media item (image / document / etc.) with an optional caption.
//
// MEDIA_PARAMS: WhatsBoost's media send fields. The text path above is known to
// work with phone/type/message; the media field names below follow WhatsBoost's
// documented media API. If media doesn't deliver once you add real URLs, this
// object is the one place to adjust the param names to match your account's docs.
export async function sendWhatsBoostMedia({
  to,
  mediaUrl,
  mediaType,
  caption,
}: SendWhatsBoostMediaInput): Promise<WhatsBoostResult> {
  const phone = normalizeWhatsAppPhone(to);
  if (!phone) return { ok: false, error: "Customer phone number is missing or invalid." };
  if (!mediaUrl) return { ok: false, error: "Media URL is missing." };

  const fields: Record<string, string> = {
    phone,
    type: "media",
    media_type: mediaType,
    media_url: mediaUrl,
  };
  if (caption) fields.message = caption;

  return postToWhatsBoost(fields);
}

// Automatic new-lead WhatsApp: a customized text message, then the product's
// images, then its brochure — all based on the inquiry's product. The text
// result is treated as the primary outcome (drives stage/notes updates upstream);
// attachment failures are best-effort and don't flip the primary result.
export async function sendAutomaticNewLeadWhatsApp(inquiry: WhatsAppInquiry): Promise<WhatsBoostResult> {
  if (process.env.WHATSAPP_AUTO_SEND_ON_NEW_LEAD === "false") {
    return { ok: false, error: "Automatic WhatsApp sending is disabled." };
  }

  const to = inquiry.phone ?? "";
  const assets = resolveProductAssets(inquiry.product);

  const textResult = await sendWhatsBoostMessage({
    to,
    message: newLeadWhatsAppMessage(inquiry),
  });

  // Don't bother sending attachments if the text message itself failed
  // (e.g. bad/missing number) — the same send would just fail again.
  if (!textResult.ok) return textResult;

  for (const imageUrl of assets.images) {
    await sendWhatsBoostMedia({ to, mediaUrl: imageUrl, mediaType: "image" });
  }
  if (assets.brochureUrl) {
    await sendWhatsBoostMedia({
      to,
      mediaUrl: assets.brochureUrl,
      mediaType: "document",
      caption: `${inquiry.product} — Azaterra Crop Science`,
    });
  }

  return textResult;
}
