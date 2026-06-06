// Payload shape produced by the IndiaMART Gmail parser.
// All fields optional; keys are normalized (lowercased, snake_case) before lookup
// so parsers can use natural names like "Buyer Name", "buyer_name", "BUYER_NAME".
import { cleanIndiaMartContactFields, normalizeIndiaState, splitContactAndCompany } from "@/lib/indiaContactCleanup";

export type IndiaMartLeadPayload = Record<string, unknown>;

const FIELD_ALIASES: Record<keyof ReturnType<typeof emptyLead>, string[]> = {
  uniqueQueryId: ["unique_query_id", "uniquequeryid", "query_id", "queryid", "lead_id", "leadid", "id"],
  queryType: ["query_type", "querytype", "type"],
  queryTime: ["query_time", "querytime", "received_at", "receivedat", "date", "timestamp"],
  senderName: ["sender_name", "sendername", "buyer_name", "buyername", "name", "from_name", "fromname", "contact_name", "contactname"],
  senderMobile: ["sender_mobile", "sendermobile", "buyer_mobile", "buyermobile", "mobile", "phone", "contact_number", "contactnumber"],
  senderEmail: ["sender_email", "senderemail", "buyer_email", "buyeremail", "email", "from_email", "fromemail"],
  senderCompany: ["sender_company", "sendercompany", "buyer_company", "buyercompany", "company", "company_name", "companyname", "firm_name", "firmname"],
  senderAddress: ["sender_address", "senderaddress", "buyer_address", "buyeraddress", "address"],
  senderCity: ["sender_city", "sendercity", "buyer_city", "buyercity", "city"],
  senderState: ["sender_state", "senderstate", "buyer_state", "buyerstate", "state"],
  senderPincode: ["sender_pincode", "senderpincode", "buyer_pincode", "buyerpincode", "pincode", "pin_code", "zipcode", "zip", "postal_code", "postalcode"],
  senderCountryIso: ["sender_country_iso", "sendercountryiso", "country_iso", "countryiso", "country"],
  senderMobileAlt: ["sender_mobile_alt", "sendermobilealt", "alt_mobile", "altmobile", "phone_alt", "phonealt"],
  senderEmailAlt: ["sender_email_alt", "senderemailalt", "alt_email", "altemail", "email_alt", "emailalt"],
  productName: ["query_product_name", "queryproductname", "product_name", "productname", "product", "subject"],
  message: ["query_message", "querymessage", "message", "body", "enquiry_message", "enquirymessage"],
  mcatName: ["query_mcat_name", "querymcatname", "mcat_name", "mcatname", "category"],
  callDuration: ["call_duration", "callduration", "duration"],
  receiverMobile: ["receiver_mobile", "receivermobile", "to_mobile", "tomobile"],
};

function emptyLead() {
  return {
    uniqueQueryId: "" as string,
    queryType: null as string | null,
    queryTime: null as Date | null,
    senderName: null as string | null,
    senderMobile: null as string | null,
    senderEmail: null as string | null,
    senderCompany: null as string | null,
    senderAddress: null as string | null,
    senderCity: null as string | null,
    senderState: null as string | null,
    senderPincode: null as string | null,
    senderCountryIso: null as string | null,
    senderMobileAlt: null as string | null,
    senderEmailAlt: null as string | null,
    productName: null as string | null,
    message: null as string | null,
    mcatName: null as string | null,
    callDuration: null as string | null,
    receiverMobile: null as string | null,
  };
}

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function pick(payload: Record<string, unknown>, aliases: string[]): string | null {
  for (const a of aliases) {
    const v = payload[a];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

// Build a stable synthetic uniqueQueryId when the parser didn't extract one.
// Hashes email|mobile|productName|date-bucket so the same email parsed twice dedupes.
function syntheticId(parts: { email: string | null; mobile: string | null; product: string | null; when: Date | null }): string {
  const dateBucket = (parts.when ?? new Date()).toISOString().slice(0, 10); // day bucket
  const seed = [
    parts.email ?? "",
    parts.mobile?.replace(/\D/g, "").slice(-10) ?? "",
    parts.product ?? "",
    dateBucket,
  ].join("|").toLowerCase();
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return `EMAIL-${Math.abs(h).toString(36).toUpperCase()}-${dateBucket.replace(/-/g, "")}`;
}

// Map a parsed IndiaMART Gmail payload to the columns we store.
// Returns null only if we couldn't extract any useful contact info (no email AND no mobile).
export function normalizeIndiaMartLeadPayload(payload: IndiaMartLeadPayload) {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) lower[normalizeKey(k)] = v;

  const out = emptyLead();
  for (const key of Object.keys(out) as Array<keyof ReturnType<typeof emptyLead>>) {
    if (key === "queryTime") continue;
    const val = pick(lower, FIELD_ALIASES[key]);
    if (val !== null) (out[key] as string) = val;
  }

  const rawTime = pick(lower, FIELD_ALIASES.queryTime);
  if (rawTime) {
    const parsed = new Date(rawTime.replace(" ", "T"));
    out.queryTime = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    out.queryTime = new Date();
  }

  applyRawEmailFallback(out, lower);

  if (isInvalidIndiaMartBuyer(out, lower)) return null;

  if (!out.senderEmail && !out.senderMobile) return null;

  if (!out.uniqueQueryId) {
    out.uniqueQueryId = syntheticId({
      email: out.senderEmail,
      mobile: out.senderMobile,
      product: out.productName,
      when: out.queryTime,
    });
  }

  return { ...cleanParsedLead(out, lower), rawJson: JSON.stringify(payload) };
}

function applyRawEmailFallback(lead: ReturnType<typeof emptyLead>, payload: Record<string, unknown>) {
  const rawText = readFirst(payload, [
    "raw_email_text",  // key used by the Gmail parser
    "body_plain",
    "bodyplain",
    "plain_body",
    "plainbody",
    "email_body",
    "emailbody",
    "raw_email",
    "rawemail",
    "text",
    "content",
    "body",
    "message",
  ]);
  if (!rawText) return;

  const subject = readFirst(payload, ["subject", "email_subject", "emailsubject"]) ?? "";
  const parsed = parseIndiaMartEmailText(rawText, subject);

  lead.senderEmail ??= parsed.email;
  lead.senderMobile ??= parsed.mobile;
  lead.senderName ??= parsed.name;
  lead.senderAddress ??= parsed.address;
  lead.senderCity ??= parsed.city;
  lead.senderState ??= parsed.state;
  lead.senderPincode ??= parsed.pincode;
  lead.senderCountryIso ??= parsed.countryIso;
  lead.productName ??= parsed.productName;
  lead.message = buildFallbackMessage(lead.message, parsed);
}

function parseIndiaMartEmailText(rawText: string, subject: string) {
  const text = rawText
    .replace(/<https?:\/\/[^>]+>/g, "\n")
    .replace(/https?:\/\/\S+/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = text
    .split(/\n/)
    .map((line) => line.replace(/\s+/g, " ").replace(/^\s*[-=]+\s*$/, "").trim())
    .filter((line) => !isIndiaMartCompanyLine(line))
    .filter(Boolean);
  const emailIndex = lines.findIndex((line) => /^e-?mail\s*:/i.test(line));
  const email = extractEmail(emailIndex >= 0 ? lines[emailIndex] : lines.find((line) => extractEmail(line)) ?? "");
  const mobile = extractPhone(lines.join(" "));
  const parsedName = parseBuyerName(lines);
  const location = parseLocation(lines, parsedName);
  const address = parseAddressLine(lines, parsedName, location.raw);
  const companyFromLocation = splitContactAndCompany(location.raw);
  const name = parsedName ?? companyFromLocation?.contactName ?? null;
  const quantity = readLabeledValue(lines, "Quantity");
  const concentration = readLabeledValue(lines, "Concentration");
  const packaging = readLabeledValue(lines, "Packaging Size");
  const productForm = readLabeledValue(lines, "Product Form");
  const grade = readLabeledValue(lines, "Grade");
  const estimatedValueText = readLabeledValue(lines, "Probable Order Value");
  const requirementType = readLabeledValue(lines, "Probable Requirement Type");

  return {
    email,
    mobile,
    name,
    address: combineAddressParts(address, location.city, location.state, location.pincode),
    city: location.city,
    state: location.state,
    pincode: location.pincode,
    countryIso: location.pincode || location.state || mobile?.startsWith("+91") ? "IN" : null,
    productName: parseProductName(subject, lines),
    quantity,
    concentration,
    packaging,
    productForm,
    grade,
    estimatedValueText,
    requirementType,
  };
}

function parseBuyerName(lines: string[]) {
  const phoneLineIndex = lines.findIndex((line) => /^phone\b/i.test(line) && /email/i.test(line));
  const contactIndex = lines.findIndex((line) => /buyer'?s contact details/i.test(line));
  const start = phoneLineIndex >= 0 ? phoneLineIndex + 1 : contactIndex >= 0 ? contactIndex + 1 : 0;
  for (const line of lines.slice(start)) {
    if (isEmailNoiseLine(line)) continue;
    if (extractEmail(line) || extractPhone(line)) continue;
    if (looksLikeLocationLine(line) || looksLikeCompanyLine(line)) continue;
    if (/member since|buylead details|quantity|packaging|grade|probable/i.test(line)) break;
    return stripStars(line);
  }
  return null;
}

function parseLocation(lines: string[], name: string | null) {
  const buyerLines = lines.filter((line) => !isIndiaMartCompanyLine(line));
  const candidates = buyerLines.filter((line) => {
    if (!line || isEmailNoiseLine(line)) return false;
    if (name && stripStars(line) === stripStars(name)) return false;
    if (extractEmail(line) || extractPhone(line)) return false;
    return /(?:\b[1-9]\d{5}\b|,\s*[A-Z]{2}\b|\s-\s*\d{4,6})/.test(line);
  });
  const raw = candidates[0] ?? "";
  const pincode = raw.match(/\b[1-9]\d{5}\b/)?.[0] ?? null;
  const state = raw.match(/,\s*([A-Z]{2})\b/)?.[1] ?? null;
  const city =
    stripStars(raw)
      .replace(name ?? "", "")
      .replace(/\b[1-9]\d{5}\b/g, "")
      .replace(/,\s*[A-Z]{2}\b/g, "")
      .replace(/\s-\s*$/g, "")
      .split(/[,-]/)[0]
      ?.trim() || null;
  return { raw, city, state, pincode };
}

function parseAddressLine(lines: string[], name: string | null, location: string) {
  const buyerLines = lines.filter((line) => !isIndiaMartCompanyLine(line));
  const idx = buyerLines.findIndex((line) => line === location);
  if (idx <= 0) return null;
  const previous = stripStars(buyerLines[idx - 1]);
  if (!previous || previous === name || isEmailNoiseLine(previous) || extractEmail(previous) || extractPhone(previous)) {
    return null;
  }
  return previous;
}

function combineAddressParts(
  address: string | null,
  city: string | null,
  state: string | null,
  pincode: string | null,
) {
  const parts = [address, city, state, pincode]
    .map((part) => stripStars(part ?? ""))
    .filter(Boolean);
  const unique: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (unique.some((existing) => existing.toLowerCase() === lower || existing.toLowerCase().includes(lower))) {
      continue;
    }
    unique.push(part);
  }
  return unique.join(", ") || null;
}

function parseProductName(subject: string, lines: string[]) {
  const fromSubject = subject.match(/buyer details for\s+(.+)/i)?.[1]?.trim();
  if (fromSubject) return stripStars(fromSubject);

  const detailsIndex = lines.findIndex((line) => /buylead details/i.test(line));
  if (detailsIndex >= 0) {
    for (const line of lines.slice(detailsIndex + 1)) {
      if (!line || isEmailNoiseLine(line)) continue;
      if (/quantity|concentration|packaging|grade|probable/i.test(line)) break;
      return stripStars(line);
    }
  }
  return null;
}

function readLabeledValue(lines: string[], label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (let index = 0; index < lines.length; index++) {
    const cleaned = stripStars(lines[index]);
    const match = cleaned.match(new RegExp(`^${escaped}\\s*:?\\s*(.+)$`, "i"));
    if (match?.[1]) return stripStars(match[1]);
    if (new RegExp(`^${escaped}\\s*:?$`, "i").test(cleaned)) {
      const next = lines[index + 1] ? stripStars(lines[index + 1]) : null;
      if (next && !isEmailNoiseLine(next)) return next;
    }
  }
  return null;
}

function buildFallbackMessage(
  existing: string | null,
  parsed: ReturnType<typeof parseIndiaMartEmailText>,
) {
  if (existing?.trim() && !looksLikeRawEmail(existing)) return existing.trim();
  const lines = [
    parsed.productName ? `Product: ${parsed.productName}` : null,
    parsed.quantity ? `Quantity: ${parsed.quantity}` : null,
    parsed.concentration ? `Concentration: ${parsed.concentration}` : null,
    parsed.packaging ? `Packaging Size: ${parsed.packaging}` : null,
    parsed.productForm ? `Product Form: ${parsed.productForm}` : null,
    parsed.grade ? `Grade: ${parsed.grade}` : null,
    parsed.estimatedValueText ? `Probable Order Value: ${parsed.estimatedValueText}` : null,
    parsed.requirementType ? `Probable Requirement Type: ${parsed.requirementType}` : null,
  ];
  return lines.filter(Boolean).join("\n") || existing;
}

function looksLikeRawEmail(value: string) {
  return /buyer'?s contact details|buylead details|reply to this message|indiamart/i.test(value);
}

function stripStars(value: string) {
  return value.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function isEmailNoiseLine(line: string) {
  if (isIndiaMartCompanyLine(line)) return true;
  return /^(from|date|subject|to):|forwarded message|buy lead through indiamart|buyer'?s contact details|reply to this message|indiamart recommends|call us|visit|dear user|contact name|company\s*\/\s*farm\s*\/\s*shop|this event isn'?t in your calendar yet$/i.test(
    stripStars(line),
  );
}

function isInvalidIndiaMartBuyer(lead: ReturnType<typeof emptyLead>, payload: Record<string, unknown>) {
  const rawText = readFirst(payload, ["raw_email_text", "body_plain", "plain_body", "email_body", "raw_email", "text", "body", "message"]);
  const subject = readFirst(payload, ["gmail_subject", "subject", "email_subject"]) ?? "";
  const hay = `${subject} ${rawText ?? ""}`.toLowerCase();

  if (lead.senderEmail && isIndiaMartInternalEmail(lead.senderEmail)) return true;
  if (/this event isn'?t in your calendar yet|google calendar|calendar\.google\.com|invitation from google calendar/i.test(hay)) {
    return true;
  }
  if (!/buy\s*lead\s+through\s+indiamart/i.test(hay)) return true;

  const hasLeadSignal = Boolean(
    lead.productName ||
      lead.message ||
      /buyer details|buyer'?s contact details|buylead details|buy\s*lead|requirement details|company\s*\/\s*farm\s*\/\s*shop|contact name|mobile|phone|quantity/i.test(hay),
  );
  return !hasLeadSignal;
}

function isIndiaMartInternalEmail(value: string) {
  return /@(?:[\w.-]+\.)?indiamart\.com$/i.test(value.trim());
}

function isIndiaMartCompanyLine(line: string) {
  const cleaned = stripStars(line).toLowerCase();
  return /indiamart\s+intermesh|assotech\s+business\s+cresterra|plot\s*no\.?\s*22|sec(?:tor)?\s*135|noida\s*-?\s*201305/.test(
    cleaned,
  );
}

function looksLikeLocationLine(line: string) {
  return /(?:\b[1-9]\d{5}\b|,\s*[A-Z]{2,3}\b|\s-\s*\d{4,6})/.test(stripStars(line));
}

function looksLikeCompanyLine(line: string) {
  return /\b(?:pvt\.?\s*ltd\.?|private\s+limited|ltd\.?|llp|inc\.?|industries|enterprise|enterprises|traders|agro|organics|farm|farms|exports|imports|corporation|company|co\.?)\b/i.test(
    stripStars(line),
  );
}

function cleanParsedLead<T extends ReturnType<typeof emptyLead>>(lead: T, payload: Record<string, unknown>): T {
  const email = extractEmail(lead.senderEmail);
  const mobile = extractPhone(lead.senderMobile);
  const contact = cleanIndiaMartContactFields({
    companyName: lead.senderCompany,
    contactName: lead.senderName,
    address: lead.senderAddress,
    city: lead.senderCity,
    state: lead.senderState,
    pincode: lead.senderPincode,
  });
  const quantity = cleanQuantity(readFirst(payload, ["quantity"]));
  const unit = cleanUnit(readFirst(payload, ["quantity_unit", "quantityunit"]));
  const concentration = cleanConcentration(readFirst(payload, ["concentration"]));
  const productName = cleanProductName(lead.productName, concentration);
  const message = buildMessage(lead.message, payload, { quantity, unit, concentration });

  return {
    ...lead,
    senderEmail: email ?? lead.senderEmail,
    senderMobile: mobile ?? lead.senderMobile,
    senderName: contact.contactName ?? lead.senderName,
    senderCompany: contact.companyName ?? lead.senderCompany,
    senderAddress: contact.address ?? lead.senderAddress,
    senderCity: contact.city ?? lead.senderCity,
    senderState: contact.state ?? normalizeIndiaState(lead.senderState) ?? lead.senderState,
    senderPincode: contact.pincode,
    productName,
    message,
  };
}

function readFirst(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function extractEmail(value: string | null) {
  return value?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
}

function extractPhone(value: string | null) {
  const match = value?.match(/(?:\+?91[-\s]?)?[6-9]\d(?:[-\s]?\d){8}/);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  return digits.length === 10 ? `+91-${digits}` : `+${digits}`;
}

function cleanQuantity(value: string | null) {
  return value?.match(/\d+(?:\.\d+)?/)?.[0] ?? null;
}

function cleanUnit(value: string | null) {
  const unit = value?.match(/\b(litre|liter|l|kg|mt|tonne|ton|bags?)\b/i)?.[0];
  return unit ?? null;
}

function cleanConcentration(value: string | null) {
  if (!value) return null;
  const cleaned = value.replace(/\*/g, "").trim();
  return /(\d+\s*(ppm|%)|azadirachtin|concentration)/i.test(cleaned) ? cleaned : null;
}

function cleanProductName(productName: string | null, concentration: string | null) {
  const value = productName?.replace(/\*/g, "").trim() ?? "";
  if (value.length > 1) return value;
  const maybeProduct = concentration?.toLowerCase().includes("cake") ? "Neem Cake Powder" : null;
  return maybeProduct ?? productName;
}

function buildMessage(
  existing: string | null,
  payload: Record<string, unknown>,
  cleaned: { quantity: string | null; unit: string | null; concentration: string | null },
) {
  if (existing?.trim()) return existing.trim();
  const packaging = readFirst(payload, ["packaging"]);
  const productForm = readFirst(payload, ["product_form", "productform"]);
  const grade = readFirst(payload, ["grade"]);
  const estimatedValue = readFirst(payload, ["estimated_value_text", "estimatedvaluetext"]);
  const requirementType = readFirst(payload, ["probable_requirement_type", "probablerequirementtype", "requirement_type", "requirementtype"]);
  const lines = [
    cleaned.quantity ? `Quantity: ${[cleaned.quantity, cleaned.unit].filter(Boolean).join(" ")}` : null,
    cleaned.concentration ? `Concentration: ${cleaned.concentration}` : null,
    packaging ? `Packaging Size: ${packaging}` : null,
    productForm ? `Product Form: ${productForm}` : null,
    grade ? `Grade: ${grade}` : null,
    estimatedValue ? `Probable Order Value: ${estimatedValue}` : null,
    requirementType ? `Probable Requirement Type: ${requirementType}` : null,
  ];
  return lines.filter(Boolean).join("\n") || null;
}
