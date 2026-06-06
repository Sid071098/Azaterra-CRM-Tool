type IndiaMartLeadLike = {
  senderName?: string | null;
  senderEmail?: string | null;
  senderEmailAlt?: string | null;
  senderCompany?: string | null;
  senderAddress?: string | null;
  senderCity?: string | null;
  senderState?: string | null;
  productName?: string | null;
  message?: string | null;
  rawJson?: string | null;
};

type IndiaMartInquiryLike = {
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  product?: string | null;
  productNotes?: string | null;
  notes?: string | null;
};

export function isUnnecessaryIndiaMartLead(lead: IndiaMartLeadLike) {
  const email = `${lead.senderEmail ?? ""} ${lead.senderEmailAlt ?? ""}`;
  if (/@(?:[\w.-]+\.)?indiamart\.com\b/i.test(email)) return true;
  if (isJunkIndiaMartIdentityValue(lead.senderName) || isJunkIndiaMartIdentityValue(lead.senderCompany)) {
    return true;
  }

  const hay = [
    lead.senderName,
    lead.senderCompany,
    lead.senderAddress,
    lead.senderCity,
    lead.senderState,
    lead.productName,
    lead.message,
    readRawJsonText(lead.rawJson),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    /this event isn'?t in your calendar yet|google calendar|calendar\.google\.com|invitation from google calendar/i.test(hay) ||
    /indiamart\s+intermesh|assotech\s+business\s+cresterra|plot\s*no\.?\s*22|sec(?:tor)?\s*135|noida\s*-?\s*201305/i.test(hay)
  );
}

export function isUnnecessaryIndiaMartInquiry(inquiry: IndiaMartInquiryLike) {
  if (isJunkIndiaMartIdentityValue(inquiry.companyName) || isJunkIndiaMartIdentityValue(inquiry.contactName)) {
    return true;
  }

  const email = inquiry.email ?? "";
  if (/@(?:[\w.-]+\.)?indiamart\.com\b/i.test(email)) return true;

  const hay = [
    inquiry.companyName,
    inquiry.contactName,
    inquiry.email,
    inquiry.phone,
    inquiry.product,
    inquiry.productNotes,
    inquiry.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    /this event isn'?t in your calendar yet|google calendar|calendar\.google\.com|invitation from google calendar/i.test(hay) ||
    /indiamart\s+intermesh|assotech\s+business\s+cresterra|plot\s*no\.?\s*22|sec(?:tor)?\s*135|noida\s*-?\s*201305/i.test(hay)
  );
}

export function isJunkIndiaMartIdentityValue(value: string | null | undefined) {
  const cleaned = value?.replace(/\*/g, "").replace(/\s+/g, " ").trim() ?? "";
  if (!cleaned) return false;
  return (
    /^(?:phone|mobile|e-?mail|email id|contact name|company\s*\/\s*farm\s*\/\s*shop|name|city|state)\s*(?:[✓✔])?$/i.test(cleaned) ||
    /^(?:sells|deals in|also deals in)\s*:/i.test(cleaned) ||
    /^(?:view mobile no\.?|get latest price|send inquiry|call seller|contact supplier|verified supplier)$/i.test(cleaned) ||
    /^[✓✔]+$/.test(cleaned)
  );
}

function readRawJsonText(rawJson: string | null | undefined) {
  if (!rawJson) return "";
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "";
    return Object.values(parsed)
      .filter((value) => typeof value === "string")
      .join(" ");
  } catch {
    return rawJson;
  }
}
