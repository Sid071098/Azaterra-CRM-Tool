// Per-product WhatsApp content for the automatic "new lead" message.
//
// Each product gets a short customized blurb, a list of product image URLs,
// and a brochure (PDF) URL. The automatic sender uses these to send a
// product-specific text message followed by the product's images and brochure.
//
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO ADD ASSETS (do this once you have the images/brochures):
//   1. Host each image and brochure at a PUBLIC https URL (e.g. Supabase
//      Storage public bucket, your website, or a CDN). WhatsApp/WhatsBoost
//      fetches the file from this URL, so it must be reachable without auth.
//   2. Paste the image URLs into `images: [...]` and the PDF URL into
//      `brochureUrl: "..."` for the matching product below.
//   3. That's it — the flow already sends them. Leaving them empty (as now)
//      just sends the customized text with no attachments.
// ─────────────────────────────────────────────────────────────────────────────

export type ProductWhatsAppAssets = {
  // One or two sentences specific to this product, inserted into the greeting.
  blurb: string;
  // Public https URLs of product images. Sent as separate WhatsApp images.
  images: string[];
  // Public https URL of the product brochure PDF. Sent as a document. Null = none.
  brochureUrl: string | null;
};

// Canonical keys mirror lib/options.ts PRODUCTS. Free-text / IndiaMART product
// names are mapped onto these keys by `resolveProductKey` below.
export const PRODUCT_WHATSAPP_KEYS = [
  "Neem Oil Cold Pressed",
  "Neem Oil EC",
  "Neem Cake Powder",
  "Karanj Oil",
  "Karanj Cake",
  "Custom Formulation",
  "Default",
] as const;

export type ProductWhatsAppKey = (typeof PRODUCT_WHATSAPP_KEYS)[number];

const PRODUCT_ASSETS: Record<ProductWhatsAppKey, ProductWhatsAppAssets> = {
  "Neem Oil Cold Pressed": {
    blurb:
      "Our cold-pressed Neem Oil is 100% pure and unrefined, with naturally high azadirachtin content — ideal for organic agriculture and formulations.",
    images: [], // TODO: add public image URLs for cold-pressed Neem Oil
    brochureUrl: null, // TODO: add public brochure PDF URL
  },
  "Neem Oil EC": {
    blurb:
      "Our Neem Oil EC formulations are available in 300 / 1500 / 3000 / 10000 PPM azadirachtin grades, stabilised and emulsifiable for easy field application.",
    images: [], // TODO: add public image URLs for Neem Oil EC
    brochureUrl: null, // TODO: add public brochure PDF URL
  },
  "Neem Cake Powder": {
    blurb:
      "Our Neem Cake Powder is a rich organic soil conditioner and natural nitrification inhibitor, available in granule and powder form.",
    images: [], // TODO: add public image URLs for Neem Cake
    brochureUrl: null, // TODO: add public brochure PDF URL
  },
  "Karanj Oil": {
    blurb:
      "Our cold-pressed Karanj (Pongamia) Oil is a high-quality bio-input used in agriculture and formulations, available in bulk packaging.",
    images: [], // TODO: add public image URLs for Karanj Oil
    brochureUrl: null, // TODO: add public brochure PDF URL
  },
  "Karanj Cake": {
    blurb:
      "Our Karanj (Pongamia) Cake is an effective organic manure and natural pest deterrent for soil application.",
    images: [], // TODO: add public image URLs for Karanj Cake
    brochureUrl: null, // TODO: add public brochure PDF URL
  },
  "Custom Formulation": {
    blurb:
      "We develop custom bio-input formulations to your target specification, grade, and packaging requirements.",
    images: [], // TODO: add public image URLs for custom formulations
    brochureUrl: null, // TODO: add public brochure PDF URL
  },
  // Used when the product doesn't match any specific entry (e.g. "Other").
  Default: {
    blurb:
      "Azaterra Crop Science manufactures cold-pressed Neem & Karanj oils, EC formulations, and organic cakes for agriculture worldwide.",
    images: [], // TODO: add public image URLs for the general catalogue
    brochureUrl: null, // TODO: add public general brochure PDF URL
  },
};

// Map any product string (canonical, free-text, or IndiaMART) onto a key.
// Tries exact canonical matches first, then keyword matching so messy
// IndiaMART / website product names still resolve to the right content.
export function resolveProductKey(product: string | null | undefined): ProductWhatsAppKey {
  const p = (product ?? "").toLowerCase();
  if (!p.trim()) return "Default";

  const isNeem = p.includes("neem");
  const isKaranj = p.includes("karanj") || p.includes("karanja") || p.includes("pongamia");
  const isCake = p.includes("cake") || p.includes("powder");
  const isEc = p.includes(" ec") || p.includes("ec ") || p.includes("ppm") || p.includes("emulsif");

  if (p.includes("custom") || p.includes("formulation")) return "Custom Formulation";
  if (isNeem && isCake) return "Neem Cake Powder";
  if (isNeem && isEc) return "Neem Oil EC";
  if (isNeem) return "Neem Oil Cold Pressed";
  if (isKaranj && isCake) return "Karanj Cake";
  if (isKaranj) return "Karanj Oil";
  return "Default";
}

export function resolveProductAssets(product: string | null | undefined): ProductWhatsAppAssets {
  return PRODUCT_ASSETS[resolveProductKey(product)];
}
