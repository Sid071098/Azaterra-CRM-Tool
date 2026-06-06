import type { IndiaMartLead, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cleanIndiaMartContactFields } from "@/lib/indiaContactCleanup";
import { isJunkIndiaMartIdentityValue } from "@/lib/indiamartLeadFilters";
import { getPrimarySalesPersonId } from "@/lib/primaryRep";

const CUSTOMER_TYPE_DEFAULT = "Distributor";

type CreateInquiryOptions = {
  createdByName?: string | null;
  createdByRole?: string | null;
  salesPersonId?: string | null;
};

type ParsedLeadDetails = {
  quantity: number | null;
  quantityUnit: string | null;
  packaging: string | null;
  estimatedValue: number | null;
  currency: string;
};

type PreparedIndiaMartInquiry = {
  companyName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  country: string;
  city: string | null;
  customerType: string;
  source: string;
  product: string;
  productNotes: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  packaging: string | null;
  estimatedValue: number | null;
  currency: string;
  notes: string | null;
  salesPersonId?: string | null;
  createdByRole?: string | null;
  createdByName?: string | null;
};

export function inferIndiaMartProduct(productName: string | null, mcatName: string | null, message?: string | null): string {
  const hay = `${productName ?? ""} ${mcatName ?? ""} ${message ?? ""}`.toLowerCase();
  const isNeem = hay.includes("neem");
  const isKaranj = hay.includes("karanj") || hay.includes("karanja") || hay.includes("pongamia");
  const isCake = hay.includes("cake") || hay.includes("powder");
  const ppm = hay.match(/(\d{3,5})\s*ppm/);

  if (hay.includes("custom") || hay.includes("formulation")) return "Custom Formulation";
  if (isNeem && isCake) return "Neem Cake Powder";
  if (isNeem && ppm?.[1]) {
    const grade = ppm[1];
    if (["300", "1500", "3000", "10000"].includes(grade)) return `Neem Oil EC ${grade} PPM`;
  }
  if (isNeem) return "Neem Oil Cold Pressed";
  if (isKaranj && isCake) return "Karanj Cake";
  if (isKaranj) return "Karanj Oil";

  // Fall back to the actual product name from the lead rather than "Other"
  const rawName = (productName ?? mcatName ?? "").replace(/\*/g, "").trim();
  return rawName || "Other";
}

export async function createInquiryFromIndiaMartLead(lead: IndiaMartLead, opts: CreateInquiryOptions = {}) {
  if (lead.importedInquiryId) {
    const importedInquiry = await prisma.inquiry.findUnique({
      where: { id: lead.importedInquiryId },
      select: { id: true, isArchived: true },
    });

    if (importedInquiry && !importedInquiry.isArchived) {
      await updateInquiryFromIndiaMartLead(lead, importedInquiry.id, opts);
      return { created: false, inquiryId: importedInquiry.id, inquiry: null };
    }

    await prisma.indiaMartLead.update({
      where: { id: lead.id },
      data: {
        importedInquiryId: null,
        importedAt: null,
        status: "New",
      },
    });
  }

  if (isInvalidIndiaMartLeadForInquiry(lead)) {
    await prisma.indiaMartLead.update({
      where: { id: lead.id },
      data: { status: "Ignored", fetchedAt: new Date() },
    });
    return { created: false, inquiryId: null, inquiry: null };
  }

  const salesPersonId =
    opts.salesPersonId === undefined ? await getPrimarySalesPersonId() : opts.salesPersonId;
  const prepared = prepareInquiryDataFromIndiaMartLead(lead, salesPersonId, opts);
  const duplicate = await findDuplicateIndiaMartInquiry({
    product: prepared.product,
    email: lead.senderEmail || lead.senderEmailAlt || null,
    phone: lead.senderMobile || lead.senderMobileAlt || null,
  });

  if (duplicate) {
    await updateInquiryFromIndiaMartLead(lead, duplicate.id, opts);
    await prisma.indiaMartLead.update({
      where: { id: lead.id },
      data: {
        status: "Imported",
        importedAt: new Date(),
        importedInquiryId: duplicate.id,
      },
    });
    return { created: false, inquiryId: duplicate.id, inquiry: null };
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      ...prepared,
      stage: "New",
    },
  });

  await prisma.indiaMartLead.update({
    where: { id: lead.id },
    data: {
      status: "Imported",
      importedAt: new Date(),
      importedInquiryId: inquiry.id,
    },
  });

  return { created: true, inquiryId: inquiry.id, inquiry };
}

async function updateInquiryFromIndiaMartLead(
  lead: IndiaMartLead,
  inquiryId: string,
  opts: CreateInquiryOptions,
) {
  if (isInvalidIndiaMartLeadForInquiry(lead)) return;
  const prepared = prepareInquiryDataFromIndiaMartLead(lead, undefined, opts);
  await prisma.inquiry.update({
    where: { id: inquiryId },
    data: {
      companyName: prepared.companyName,
      contactName: prepared.contactName,
      email: prepared.email,
      phone: prepared.phone,
      country: prepared.country,
      city: prepared.city,
      customerType: prepared.customerType,
      source: prepared.source,
      product: prepared.product,
      productNotes: prepared.productNotes,
      quantity: prepared.quantity,
      quantityUnit: prepared.quantityUnit,
      packaging: prepared.packaging,
      estimatedValue: prepared.estimatedValue,
      currency: prepared.currency,
      notes: prepared.notes,
    },
  });
}

function prepareInquiryDataFromIndiaMartLead(
  lead: IndiaMartLead,
  salesPersonId: string | null | undefined,
  opts: CreateInquiryOptions,
): PreparedIndiaMartInquiry {
  const details = parseLeadDetails(lead);
  const cleanedContact = cleanIndiaMartContactFields({
    companyName: lead.senderCompany,
    contactName: lead.senderName,
    address: lead.senderAddress,
    city: lead.senderCity,
    state: lead.senderState,
    pincode: lead.senderPincode,
  });
  const product = inferIndiaMartProduct(lead.productName, lead.mcatName, lead.message);

  return {
    companyName: cleanedContact.companyName || "Unknown (IndiaMART)",
    contactName: cleanedContact.contactName || lead.senderName || "Unknown",
    email: lead.senderEmail || lead.senderEmailAlt || null,
    phone: lead.senderMobile || lead.senderMobileAlt || null,
    country: inferCountry(lead),
    city: cleanedContact.city || lead.senderCity || null,
    customerType: CUSTOMER_TYPE_DEFAULT,
    source: "IndiaMART",
    product,
    productNotes: lead.productName || lead.mcatName || null,
    quantity: details.quantity,
    quantityUnit: details.quantityUnit,
    packaging: details.packaging,
    estimatedValue: details.estimatedValue,
    currency: details.currency,
    notes: buildNotes(lead, cleanedContact),
    salesPersonId,
    createdByRole: opts.createdByRole ?? "Automation",
    createdByName: opts.createdByName ?? "IndiaMART Gmail sync",
  };
}

async function findDuplicateIndiaMartInquiry(
  match: { product: string; email: string | null; phone: string | null },
) {
  const duplicateWindowDays = normalizeDuplicateWindowDays(process.env.INDIAMART_DUPLICATE_WINDOW_DAYS);
  const createdAfter = new Date(Date.now() - duplicateWindowDays * 24 * 60 * 60 * 1000);
  const phoneDigits = match.phone?.replace(/\D/g, "").slice(-10);
  const or: Prisma.InquiryWhereInput[] = [];

  if (match.email) or.push({ email: match.email });
  if (phoneDigits && phoneDigits.length >= 10) or.push({ phone: { contains: phoneDigits } });
  if (or.length === 0) return null;

  return prisma.inquiry.findFirst({
    where: {
      source: "IndiaMART",
      product: match.product,
      isArchived: false,
      createdAt: { gte: createdAfter },
      OR: or,
    },
    orderBy: { createdAt: "desc" },
  });
}

function normalizeDuplicateWindowDays(value: string | undefined) {
  const parsed = Number(value || 30);
  if (!Number.isFinite(parsed) || parsed < 1) return 30;
  return Math.min(Math.floor(parsed), 365);
}

function isInvalidIndiaMartLeadForInquiry(lead: IndiaMartLead) {
  const email = lead.senderEmail || lead.senderEmailAlt || "";
  if (/@(?:[\w.-]+\.)?indiamart\.com$/i.test(email.trim())) return true;

  const cleanedContact = cleanIndiaMartContactFields({
    companyName: lead.senderCompany,
    contactName: lead.senderName,
    address: lead.senderAddress,
    city: lead.senderCity,
    state: lead.senderState,
    pincode: lead.senderPincode,
  });
  if (isJunkIndiaMartIdentityValue(lead.senderCompany)) return true;
  if (isJunkIndiaMartIdentityValue(lead.senderName) && !cleanedContact.companyName) return true;
  if (!cleanedContact.companyName && !cleanedContact.contactName) return true;

  const raw = parseRawJson(lead.rawJson);
  const sourceText = [
    lead.senderName,
    lead.senderCompany,
    lead.senderAddress,
    lead.message,
    readPayload(raw, "raw_email_text"),
    readPayload(raw, "gmail_subject"),
  ].filter(Boolean).join(" ");

  return /this event isn'?t in your calendar yet|google calendar|calendar\.google\.com|invitation from google calendar/i.test(
    sourceText,
  );
}

function inferCountry(lead: IndiaMartLead) {
  if (lead.senderCountryIso === "IN") return "India";
  if (lead.senderCountryIso) return lead.senderCountryIso;
  const mobile = `${lead.senderMobile ?? ""} ${lead.senderMobileAlt ?? ""}`;
  if (mobile.includes("+91") || mobile.replace(/\D/g, "").startsWith("91")) return "India";
  if (lead.senderState || lead.senderPincode) return "India";
  return "Unknown";
}

function parseLeadDetails(lead: IndiaMartLead): ParsedLeadDetails {
  const payload = parseRawJson(lead.rawJson);
  const message = lead.message ?? "";
  const quantityText = readPayload(payload, "quantity") ?? matchLine(message, "quantity");
  const quantityMatch = quantityText?.match(/([\d.]+)\s*([a-zA-Z]+)/);
  const orderValueText =
    readPayload(payload, "estimated_value_text") ??
    readPayload(payload, "estimatedvaluetext") ??
    readPayload(payload, "probable_order_value") ??
    readPayload(payload, "probableordervalue") ??
    matchLine(message, "probable order value");
  const hasRupees = /rs\.?|inr|₹/i.test(orderValueText ?? "");
  const estimatedValue = parseFirstNumber(orderValueText);

  return {
    quantity: quantityMatch ? Number(quantityMatch[1]) : parseFirstNumber(quantityText),
    quantityUnit: normalizeUnit(quantityMatch?.[2] ?? readPayload(payload, "quantity_unit")),
    packaging:
      readPayload(payload, "packaging") ??
      readPayload(payload, "packaging_size") ??
      readPayload(payload, "packagingsize") ??
      matchLine(message, "packaging size"),
    estimatedValue,
    currency: hasRupees ? "INR" : "USD",
  };
}

function buildNotes(lead: IndiaMartLead, contact: ReturnType<typeof cleanIndiaMartContactFields>) {
  const raw = parseRawJson(lead.rawJson);
  const sourceExcerpt = readPayload(raw, "raw_email_text");
  const fullAddress = [lead.senderAddress, contact.address, contact.city, contact.state, contact.pincode]
    .filter((p) => p && !/indiamart\s+intermesh|assotech\s+business\s+cresterra|plot\s*no\.?\s*22|sec(?:tor)?\s*135|noida\s*-?\s*201305/i.test(p))
    .filter(Boolean)
    .join(", ");
  const lines = [
    lead.message,
    contact.companyName ? `IndiaMART Company: ${contact.companyName}` : null,
    contact.contactName ? `IndiaMART Contact: ${contact.contactName}` : null,
    fullAddress ? `Address: ${fullAddress}` : null,
    sourceExcerpt ? `Original Gmail lead excerpt:\n${sourceExcerpt.slice(0, 1200)}` : null,
  ];
  return lines.filter(Boolean).join("\n\n") || null;
}


function parseRawJson(rawJson: string | null) {
  if (!rawJson) return {};
  try {
    const parsed = JSON.parse(rawJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readPayload(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function matchLine(text: string, label: string) {
  const pattern = new RegExp(`${label}\\s*:?\\s*([^\\n]+)`, "i");
  return text.match(pattern)?.[1]?.trim() ?? null;
}

function parseFirstNumber(text: string | null | undefined) {
  const match = text?.replace(/,/g, "").match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

function normalizeUnit(unit: string | null | undefined) {
  if (!unit) return null;
  const lower = unit.toLowerCase();
  if (lower.startsWith("lit") || lower === "l") return "L";
  if (lower.startsWith("kg") || lower.startsWith("kilo")) return "KG";
  if (lower.startsWith("ton") || lower === "mt") return "MT";
  return unit;
}
