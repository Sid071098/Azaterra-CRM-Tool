import type { IndiaMartLead } from "@prisma/client";
import { prisma } from "@/lib/db";
import { splitContactAndCompany } from "@/lib/indiaContactCleanup";
import {
  extractPlainTextFromGmailMessage,
  getGmailMessage,
  getMessageHeader,
  refreshAccessToken,
  searchGmailMessages,
  type GmailFullMessage,
  type GmailMessageListItem,
} from "@/lib/gmail";
import { normalizeIndiaMartLeadPayload, type IndiaMartLeadPayload } from "@/lib/indiamart";
import { createInquiryFromIndiaMartLead } from "@/lib/indiamartInquiry";
import { sendNewLeadWhatsAppIfConfigured } from "@/lib/inquiryWhatsAppAutomation";

// Single combined OR query — one Gmail API call instead of 9 sequential ones.
// Gmail treats space-separated terms inside {} as OR.
const DEFAULT_INDIAMART_GMAIL_QUERY =
  '{from:indiamart.com from:buyleads@indiamart.com "Buy Lead through IndiaMART" "BuyLead through IndiaMART" "Company / Farm / Shop" subject:"Buyer Details" subject:BuyLead subject:"Buy Lead" subject:IndiaMART}';

export type IndiaMartGmailSyncWindow = "today" | "week" | "all";

export type IndiaMartGmailAccount = {
  email: string;
  refreshToken: string;
  salesPersonId?: string | null;
  ownerId?: string | null;
};

export type IndiaMartGmailSyncResult = {
  checked: number;
  inserted: number;
  updated: number;
  skipped: number;
  filtered: number;
  inquiriesCreated: number;
  whatsappSent: number;
  whatsappFailed: number;
};

export async function syncIndiaMartLeadsFromGmailAccount(
  account: IndiaMartGmailAccount,
  options: { syncWindow?: IndiaMartGmailSyncWindow } = {},
): Promise<IndiaMartGmailSyncResult> {
  const accessToken = await refreshAccessToken(account.refreshToken);
  const configuredQuery = process.env.INDIAMART_GMAIL_QUERY?.trim();
  const syncWindow = options.syncWindow ?? "week";
  const maxResults = normalizeMaxResults(process.env.INDIAMART_GMAIL_MAX_RESULTS, syncWindow);
  const autoImport = process.env.INDIAMART_GMAIL_AUTO_IMPORT ?? "true";

  const messages = await searchIndiaMartGmailMessages(accessToken, syncWindow, maxResults, configuredQuery);
  const result: IndiaMartGmailSyncResult = {
    checked: messages.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    filtered: 0,
    inquiriesCreated: 0,
    whatsappSent: 0,
    whatsappFailed: 0,
  };

  for (const item of messages) {
    const message = await getGmailMessage(accessToken, item.id);
    const payload = parseIndiaMartGmailMessage(message);
    if (!isBuyerLeadPayload(payload)) {
      result.filtered++;
      continue;
    }
    const normalized = normalizeIndiaMartLeadPayload(payload);
    if (!normalized) {
      result.skipped++;
      continue;
    }

    let lead: IndiaMartLead;
    const existing = await prisma.indiaMartLead.findUnique({
      where: { uniqueQueryId: normalized.uniqueQueryId },
    });

    if (existing) {
      lead = await prisma.indiaMartLead.update({
        where: { uniqueQueryId: normalized.uniqueQueryId },
        data: { ...normalized, fetchedAt: new Date() },
      });
      result.updated++;
    } else {
      lead = await prisma.indiaMartLead.create({ data: normalized });
      result.inserted++;
    }

    if (autoImport !== "false") {
      const inquiry = await createInquiryFromIndiaMartLead(lead, {
        salesPersonId: account.salesPersonId ?? undefined,
        createdByRole: "Automation",
        createdByName: "IndiaMART Gmail sync",
      });
      if (inquiry.created) result.inquiriesCreated++;
      if (inquiry.inquiry) {
        const whatsapp = await sendNewLeadWhatsAppIfConfigured(inquiry.inquiry);
        if (whatsapp.attempted) {
          if (whatsapp.ok) result.whatsappSent++;
          else result.whatsappFailed++;
        }
      }
    }
  }

  return result;
}

async function searchIndiaMartGmailMessages(
  accessToken: string,
  syncWindow: IndiaMartGmailSyncWindow,
  maxResults: number,
  configuredQuery?: string,
) {
  const base = configuredQuery ?? DEFAULT_INDIAMART_GMAIL_QUERY;
  const query = applySyncWindow(base, syncWindow);
  return searchAllGmailMessages(accessToken, query, maxResults);
}

function applySyncWindow(query: string, syncWindow: IndiaMartGmailSyncWindow) {
  const withoutDateFilters = query
    .replace(/\bnewer_than:\S+/gi, "")
    .replace(/\bolder_than:\S+/gi, "")
    .replace(/\bafter:\S+/gi, "")
    .replace(/\bbefore:\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (syncWindow === "all") return withoutDateFilters;
  if (syncWindow === "today") return `newer_than:1d ${withoutDateFilters}`;
  return `newer_than:7d ${withoutDateFilters}`;
}

async function searchAllGmailMessages(accessToken: string, query: string, maxResults: number) {
  const messages: GmailMessageListItem[] = [];
  let pageToken: string | undefined;

  do {
    const remaining = maxResults - messages.length;
    const page = await searchGmailMessages(accessToken, query, Math.min(remaining, 100), pageToken);
    messages.push(...(page.messages ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken && messages.length < maxResults);

  return messages.slice(0, maxResults);
}

function normalizeMaxResults(value: string | undefined, syncWindow: IndiaMartGmailSyncWindow) {
  const defaultValue = syncWindow === "all" ? 500 : syncWindow === "week" ? 100 : 50;
  const parsed = Number(value || defaultValue);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;
  return Math.min(Math.floor(parsed), 500);
}

export function parseIndiaMartGmailMessage(message: GmailFullMessage): IndiaMartLeadPayload {
  const subject = getMessageHeader(message, "Subject");
  const dateHeader = getMessageHeader(message, "Date");
  const text = normalizeEmailText(extractPlainTextFromGmailMessage(message));
  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanLine(line))
    .filter((line) => !isIndiaMartCompanyLine(line))
    .filter(Boolean);
  const contact = parseContact(lines);
  const details = parseDetails(lines);
  const productName = parseProductName(subject, lines);
  const queryTime = parseQueryTime(message, dateHeader);
  const uniqueQueryId = parseUniqueQueryId(lines);

  return {
    unique_query_id: uniqueQueryId,
    query_type: "B",
    query_time: queryTime.toISOString(),
    sender_name: contact.name,
    sender_mobile: contact.mobile,
    sender_email: contact.email,
    sender_company: contact.company,
    sender_address: contact.address,
    sender_city: contact.city,
    sender_state: contact.state,
    sender_pincode: contact.pincode,
    sender_country_iso: "IN",
    query_product_name: productName,
    quantity: details.quantity,
    quantity_unit: details.quantityUnit,
    concentration: details.concentration,
    packaging: details.packaging,
    grade: details.grade,
    estimated_value_text: details.estimatedValueText,
    query_message: buildQueryMessage(details, productName),
    gmail_subject: subject,
    gmail_message_id: message.id,
    gmail_thread_id: message.threadId,
    raw_email_text: text,
  };
}

function isBuyerLeadPayload(payload: IndiaMartLeadPayload) {
  const rawText = readPayloadString(payload, "raw_email_text");
  const subject = readPayloadString(payload, "gmail_subject");
  const email = readPayloadString(payload, "sender_email");
  const product = readPayloadString(payload, "query_product_name");
  const message = readPayloadString(payload, "query_message");
  const hay = `${subject} ${rawText}`.toLowerCase();

  if (email && isIndiaMartInternalEmail(email)) return false;
  if (/this event isn'?t in your calendar yet|google calendar|calendar\.google\.com|invitation from google calendar/i.test(hay)) {
    return false;
  }
  if (!/buy\s*lead\s+through\s+indiamart/i.test(hay)) return false;

  return Boolean(
    product ||
      message ||
      /buyer details|buyer'?s contact details|buylead details|buy\s*lead|requirement details|company\s*\/\s*farm\s*\/\s*shop|contact name|mobile|phone|quantity/i.test(hay),
  );
}

function readPayloadString(payload: IndiaMartLeadPayload, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function isIndiaMartInternalEmail(value: string) {
  return /@(?:[\w.-]+\.)?indiamart\.com$/i.test(value.trim());
}

function parseUniqueQueryId(lines: string[]) {
  const patterns = [
    /(?:unique\s*)?(?:query|enquiry|inquiry|buylead|lead)\s*(?:id|no\.?|number)?\s*[:#-]\s*([A-Z0-9-]{5,})/i,
    /\b(?:BL|IM)[-_]?\d{5,}\b/i,
  ];
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match?.[1]) return stripStars(match[1]).toUpperCase();
      if (match?.[0] && /^(?:BL|IM)/i.test(match[0])) return stripStars(match[0]).toUpperCase();
    }
  }
  return null;
}

function normalizeEmailText(value: string) {
  return value
    .replace(/^-{2,}\s*Forwarded message\s*-{2,}$/gim, "\n")
    .replace(/<https?:\/\/[^>]+>/g, "\n")
    .replace(/https?:\/\/\S+/g, "\n")
    .replace(/^\s*(?:From|Sent|Date|To|Subject)\s*:\s.*$/gim, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLine(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^\s*[-=]+\s*$/, "")
    .trim();
}

function parseContact(lines: string[]) {
  const contactLines = getContactSectionLines(lines);
  const scopedLines = contactLines.length ? contactLines : lines;
  const combinedLocation = parseCombinedNameLocation(scopedLines) ?? parseCombinedNameLocation(lines);
  const emailIndex = scopedLines.findIndex((line) => /^(?:e-?mail|email id|buyer e-?mail)\s*:/i.test(line));
  const email =
    readLabeledValue(scopedLines, "Email") ??
    readLabeledValue(scopedLines, "E-mail") ??
    readLabeledValue(scopedLines, "Email Id") ??
    extractEmail(emailIndex >= 0 ? scopedLines[emailIndex] : scopedLines.find((line) => extractEmail(line)) ?? "") ??
    null;
  const mobile =
    extractPhone(
      readFirstLabeledValue(scopedLines, ["Mobile", "Phone", "Contact Number", "Buyer Mobile", "Buyer Phone"]) ?? "",
    ) ??
    extractPhone(scopedLines.join(" ")) ??
    extractPhone(lines.join(" ")) ??
    null;
  const parsedName =
    readFirstLabeledValue(scopedLines, ["Buyer Name", "Sender Name", "Contact Name", "Contact Person", "Name"]) ??
    parseBuyerName(scopedLines.length ? scopedLines : lines) ??
    combinedLocation?.contactName ??
    null;
  const nameSplit = splitContactAndCompany(parsedName);
  const company =
    readFirstLabeledValue(scopedLines, ["Company / Farm / Shop", "Company", "Company Name", "Firm Name", "Sender Company"]) ??
    nameSplit?.companyName ??
    combinedLocation?.name ??
    parseUnlabeledCompany(scopedLines.length ? scopedLines : lines, parsedName, combinedLocation?.raw ?? null) ??
    null;
  const companySplit = splitContactAndCompany(company);
  const name = nameSplit?.contactName ?? parsedName;
  const location = parseLocation(scopedLines.length ? scopedLines : lines, name);
  const city = readFirstLabeledValue(scopedLines, ["City", "Buyer City"]) ?? combinedLocation?.city ?? location.city;
  const state = readFirstLabeledValue(scopedLines, ["State", "Buyer State"]) ?? combinedLocation?.state ?? location.state;
  const pincode = readFirstLabeledValue(scopedLines, ["Pincode", "Pin Code", "Postal Code", "Zip"]) ?? combinedLocation?.pincode ?? location.pincode;
  const addressLine =
    readFirstLabeledValue(scopedLines, ["Address", "Buyer Address", "Sender Address"]) ??
    parseAddressLine(scopedLines.length ? scopedLines : lines, name, location.raw);
  const address = combineAddressParts(addressLine, city, state, pincode);

  return {
    name: name ?? companySplit?.contactName ?? null,
    mobile,
    email,
    company: companySplit?.companyName ?? company,
    address,
    city,
    state,
    pincode,
  };
}

function getContactSectionLines(lines: string[]) {
  const start = lines.findIndex((line) => /buyer'?s contact details|contact details|buyer details/i.test(line));
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && /buylead details|lead details|requirement details|member since|indiamart recommends/i.test(line));
  return lines.slice(start + 1, end > start ? end : undefined);
}

function parseBuyerName(lines: string[]) {
  const phoneLineIndex = lines.findIndex((line) => /^phone\b/i.test(line) && /email/i.test(line));
  const start = phoneLineIndex >= 0 ? phoneLineIndex + 1 : lines.findIndex((line) => /buyer'?s contact details/i.test(line)) + 1;
  for (const line of lines.slice(Math.max(start, 0))) {
    if (isNoiseLine(line)) continue;
    if (extractEmail(line) || extractPhone(line)) continue;
    if (looksLikeLocationLine(line) || looksLikeCompanyLine(line)) continue;
    if (/member since|buylead details|quantity|packaging|grade|probable/i.test(line)) break;
    return stripStars(line);
  }
  return null;
}

function parseLocation(lines: string[], name: string | null) {
  const buyerLines = lines.filter((line) => !isIndiaMartCompanyLine(line));
  const combined = parseCombinedNameLocation(buyerLines);
  if (combined) {
    return {
      raw: combined.raw,
      city: combined.city,
      state: combined.state,
      pincode: combined.pincode,
    };
  }

  const candidates = buyerLines.filter((line) => {
    if (!line || isNoiseLine(line)) return false;
    if (name && stripStars(line) === stripStars(name)) return false;
    if (extractEmail(line) || extractPhone(line)) return false;
    return /(?:\b[1-9]\d{5}\b|,\s*[A-Z]{2}\b|\s-\s*\d{4,6})/.test(line);
  });
  const raw = candidates[0] ?? "";
  const pincode = raw.match(/\b[1-9]\d{5}\b/)?.[0] ?? null;
  const state = raw.match(/,\s*([A-Z]{2})\b/)?.[1] ?? null;
  const city = stripStars(raw)
    .replace(name ?? "", "")
    .replace(/\b[1-9]\d{5}\b/g, "")
    .replace(/,\s*[A-Z]{2}\b/g, "")
    .replace(/\s-\s*$/g, "")
    .split(/[,-]/)[0]
    ?.trim() || null;
  return { raw, city, state, pincode };
}

function parseCombinedNameLocation(lines: string[]) {
  for (const line of lines) {
    const cleaned = stripStars(line);
    if (isNoiseLine(cleaned) || extractEmail(cleaned) || extractPhone(cleaned)) continue;
    const match = cleaned.match(/^(.+?)\s*-\s*([1-9]\d{5})(?:\s*,\s*([A-Z]{2,3}|[A-Za-z ]+))?$/);
    if (!match) continue;

    const beforeDash = match[1].trim();
    const split = splitNameAndCity(beforeDash);

    // Pure location line: "Hyderabad - 500001, TS" — no comma in beforeDash, ≤ 2 words,
    // no company-suffix keywords. The text before the dash IS the city, not a company name.
    if (!split.city && split.name.split(/\s+/).filter(Boolean).length <= 2 && !looksLikeCompanyLine(split.name)) {
      return {
        raw: cleaned,
        name: null,
        contactName: null,
        city: split.name,
        pincode: match[2],
        state: normalizeState(match[3] ?? null),
      };
    }

    const contactCompany = splitContactAndCompany(split.name);
    return {
      raw: cleaned,
      name: contactCompany?.companyName ?? split.name,
      contactName: contactCompany?.contactName ?? null,
      city: split.city,
      pincode: match[2],
      state: normalizeState(match[3] ?? null),
    };
  }
  return null;
}

function splitNameAndCity(value: string) {
  const commaParts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    return {
      name: commaParts.slice(0, -1).join(", "),
      city: commaParts[commaParts.length - 1],
    };
  }

  const companySuffix = value.match(
    /^(.+\b(?:pvt\.?\s*ltd\.?|private\s+limited|ltd\.?|llp|inc\.?|industries|enterprise|enterprises|traders|agro|organics|farm|farms|exports|imports|corporation|company|co\.?))\s+(.+)$/i,
  );
  if (companySuffix) {
    return { name: companySuffix[1].trim(), city: companySuffix[2].trim() };
  }

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return { name: words.slice(0, -1).join(" "), city: words[words.length - 1] };
  }
  return { name: value, city: null };
}

function normalizeState(value: string | null) {
  if (!value) return null;
  const cleaned = value.trim();
  const stateCodes: Record<string, string> = {
    AP: "Andhra Pradesh",
    AR: "Arunachal Pradesh",
    AS: "Assam",
    BR: "Bihar",
    CG: "Chhattisgarh",
    CH: "Chandigarh",
    DL: "Delhi",
    GA: "Goa",
    GJ: "Gujarat",
    HR: "Haryana",
    HP: "Himachal Pradesh",
    JH: "Jharkhand",
    JK: "Jammu and Kashmir",
    KA: "Karnataka",
    KL: "Kerala",
    MH: "Maharashtra",
    MP: "Madhya Pradesh",
    OD: "Odisha",
    OR: "Odisha",
    PB: "Punjab",
    RJ: "Rajasthan",
    TN: "Tamil Nadu",
    TS: "Telangana",
    TG: "Telangana",
    UP: "Uttar Pradesh",
    UK: "Uttarakhand",
    UT: "Uttarakhand",
    WB: "West Bengal",
  };
  return stateCodes[cleaned.toUpperCase()] ?? cleaned;
}

function parseAddressLine(lines: string[], name: string | null, location: string) {
  const buyerLines = lines.filter((line) => !isIndiaMartCompanyLine(line));
  const idx = buyerLines.findIndex((line) => line === location);
  if (idx <= 0) return null;
  const previous = stripStars(buyerLines[idx - 1]);
  if (!previous || previous === name || isNoiseLine(previous) || extractEmail(previous) || extractPhone(previous)) {
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

function parseDetails(lines: string[]) {
  const quantityText = readFirstLabeledValue(lines, ["Quantity", "Approx Quantity", "Required Quantity"]);
  const quantityParts = quantityText?.match(/([\d.]+)\s*([a-zA-Z]+)/);
  return {
    quantity: quantityParts?.[1] ?? quantityText ?? null,
    quantityUnit: quantityParts?.[2] ?? null,
    concentration: readLabeledValue(lines, "Concentration"),
    packaging: readFirstLabeledValue(lines, ["Packaging Size", "Packaging", "Pack Size"]),
    productForm: readFirstLabeledValue(lines, ["Product Form", "Form"]),
    grade: readLabeledValue(lines, "Grade"),
    estimatedValueText: readFirstLabeledValue(lines, ["Probable Order Value", "Estimated Value", "Order Value"]),
    requirementType: readFirstLabeledValue(lines, ["Probable Requirement Type", "Requirement Type"]),
  };
}

function parseProductName(subject: string, lines: string[]) {
  const fromSubject =
    subject.match(/buyer details for\s+(.+)/i)?.[1]?.trim() ??
    subject.match(/(?:buy\s*lead|buylead|requirement|enquiry|inquiry)\s*(?:for|:|-)\s*(.+)/i)?.[1]?.trim();
  if (fromSubject) return stripStars(fromSubject);

  const labeled = readFirstLabeledValue(lines, [
    "Product",
    "Product Name",
    "Query Product Name",
    "Requirement",
    "Required Product",
  ]);
  if (labeled) return labeled;

  const detailsIndex = lines.findIndex((line) => /buylead details|lead details|requirement details/i.test(line));
  if (detailsIndex >= 0) {
    for (const line of lines.slice(detailsIndex + 1)) {
      if (!line || isNoiseLine(line)) continue;
      if (/quantity|concentration|packaging|grade|probable/i.test(line)) break;
      return stripStars(line);
    }
  }
  return null;
}

function readFirstLabeledValue(lines: string[], labels: string[]) {
  for (const label of labels) {
    const value = readLabeledValue(lines, label);
    if (value) return value;
  }
  return null;
}

function readLabeledValue(lines: string[], label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (let index = 0; index < lines.length; index++) {
    const cleaned = stripStars(lines[index]);
    const match = cleaned.match(new RegExp(`^${escaped}\\s*(?::|-|\\u2013|\\u2014)\\s*(.+)$`, "i"));
    if (match?.[1]) return stripStars(match[1]);
    if (new RegExp(`^${escaped}\\s*(?::|-|\\u2013|\\u2014)?$`, "i").test(cleaned)) {
      const next = lines[index + 1] ? stripStars(lines[index + 1]) : null;
      if (next && !isNoiseLine(next)) return next;
    }
  }
  return null;
}

function buildQueryMessage(details: ReturnType<typeof parseDetails>, productName: string | null) {
  const lines = [
    productName ? `Product: ${productName}` : null,
    details.quantity ? `Quantity: ${[details.quantity, details.quantityUnit].filter(Boolean).join(" ")}` : null,
    details.concentration ? `Concentration: ${details.concentration}` : null,
    details.packaging ? `Packaging Size: ${details.packaging}` : null,
    details.productForm ? `Product Form: ${details.productForm}` : null,
    details.grade ? `Grade: ${details.grade}` : null,
    details.estimatedValueText ? `Probable Order Value: ${details.estimatedValueText}` : null,
    details.requirementType ? `Probable Requirement Type: ${details.requirementType}` : null,
  ];
  return lines.filter(Boolean).join("\n") || null;
}

function parseQueryTime(message: GmailFullMessage, dateHeader: string) {
  if (message.internalDate) {
    const date = new Date(Number(message.internalDate));
    if (!Number.isNaN(date.getTime())) return date;
  }
  const date = new Date(dateHeader);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function stripStars(value: string) {
  return value.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function isNoiseLine(line: string) {
  if (isIndiaMartCompanyLine(line)) return true;
  if (isJunkIdentityLine(line)) return true;
  return /^(from|date|subject|to):|forwarded message|buy lead through indiamart|buyer'?s contact details|reply to this message|indiamart recommends|call us|visit|dear user|contact name|company\s*\/\s*farm\s*\/\s*shop|this event isn'?t in your calendar yet$/i.test(
    stripStars(line),
  );
}

function isJunkIdentityLine(line: string) {
  const cleaned = stripStars(line);
  return (
    /^(?:phone|mobile|e-?mail|email id|contact name|company\s*\/\s*farm\s*\/\s*shop|name|city|state)\s*(?:[✓✔])?$/i.test(cleaned) ||
    /^(?:sells|deals in|also deals in)\s*:/i.test(cleaned) ||
    /^(?:view mobile no\.?|get latest price|send inquiry|call seller|contact supplier|verified supplier)$/i.test(cleaned) ||
    /^[✓✔]+$/.test(cleaned)
  );
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

// Find an unlabeled company line in Format B emails (star-wrapped, no labels).
// After we know the buyer's name and location, any remaining non-noise line that
// looks like a company name (has company-suffix keywords) is the company field.
function parseUnlabeledCompany(
  lines: string[],
  name: string | null,
  locationRaw: string | null,
): string | null {
  const nameClean = name ? stripStars(name).toLowerCase() : null;
  const locClean = locationRaw ? stripStars(locationRaw).toLowerCase() : null;
  for (const line of lines) {
    const cleaned = stripStars(line);
    if (!cleaned || isNoiseLine(cleaned)) continue;
    if (extractEmail(cleaned) || extractPhone(cleaned)) continue;
    if (looksLikeLocationLine(cleaned)) continue;
    if (nameClean && cleaned.toLowerCase() === nameClean) continue;
    if (locClean && cleaned.toLowerCase() === locClean) continue;
    if (looksLikeCompanyLine(cleaned)) return cleaned;
  }
  return null;
}

function extractEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
}

function extractPhone(value: string) {
  const match = value.match(/(?:\+?91[-\s]?)?[6-9]\d(?:[-\s]?\d){8}/);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  return digits.length === 10 ? `+91-${digits}` : `+${digits}`;
}
