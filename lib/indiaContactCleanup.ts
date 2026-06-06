export type CleanContactInput = {
  companyName?: string | null;
  contactName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export function isJunkIndiaMartContactValue(value: string | null | undefined) {
  const cleaned = cleanSimpleValue(value) ?? "";
  if (!cleaned) return false;
  return (
    /^(?:phone|mobile|e-?mail|email id|contact name|company\s*\/\s*farm\s*\/\s*shop|name|city|state)\s*(?:[✓✔])?$/i.test(cleaned) ||
    /^(?:sells|deals in|also deals in)\s*:/i.test(cleaned) ||
    /^(?:view mobile no\.?|get latest price|send inquiry|call seller|contact supplier|verified supplier)$/i.test(cleaned) ||
    /^[✓✔]+$/.test(cleaned)
  );
}

export function cleanIndiaMartContactFields(input: CleanContactInput) {
  const address = isIndiaMartCompanyValue(input.address) || isJunkIndiaMartContactValue(input.address) ? null : input.address;
  const city = isIndiaMartCompanyValue(input.city) ? null : input.city;
  const state = isIndiaMartCompanyValue(input.state) ? null : input.state;
  const pincode = isIndiaMartCompanyValue(input.pincode) ? null : input.pincode;
  const splitFromCompany = splitContactAndCompany(input.companyName);
  const company = isJunkIndiaMartContactValue(input.companyName)
    ? null
    : cleanLocationSuffix(splitFromCompany?.companyName ?? input.companyName);
  const contact = isJunkIndiaMartContactValue(input.contactName) ? null : cleanLocationSuffix(input.contactName);
  const combined =
    parseCombinedNameLocation(input.companyName) ??
    parseCombinedNameLocation(input.contactName) ??
    parseCombinedNameLocation(address);

  const companyName = company || combined?.name || contact || null;
  const contactName = contact || splitFromCompany?.contactName || combined?.contactName || null;

  return {
    companyName,
    contactName,
    address: cleanAddress(address, combined?.raw),
    city: cleanCity(city) || combined?.city || null,
    state: normalizeIndiaState(state) || combined?.state || null,
    pincode:
      extractPincode(pincode) ||
      combined?.pincode ||
      extractPincode(city) ||
      extractPincode(state) ||
      extractPincode(address) ||
      null,
  };
}

export function formatIndiaMartBuyerIdentity(input: CleanContactInput) {
  const cleaned = cleanIndiaMartContactFields(input);
  const companyName = cleaned.companyName || cleanSimpleValue(input.companyName);
  const contactName = cleaned.contactName || cleanSimpleValue(input.contactName);
  const usableContact =
    contactName && !isJunkIndiaMartContactValue(contactName) && !/^unknown$/i.test(contactName)
      ? contactName
      : null;
  const usableCompany =
    companyName && !isJunkIndiaMartContactValue(companyName) && !/^unknown(?:\s*\(indiamart\))?$/i.test(companyName)
      ? companyName
      : null;

  if (usableContact && usableCompany) {
    const contact = usableContact.toLowerCase();
    const company = usableCompany.toLowerCase();
    if (company.includes(contact)) return usableCompany;
    if (contact.includes(company)) return usableContact;
    return `${usableContact}, ${usableCompany}`;
  }

  return usableCompany || usableContact || "Unknown buyer";
}

function cleanLocationSuffix(value: string | null | undefined) {
  if (!value) return null;
  const combined = parseCombinedNameLocation(value);
  if (combined?.name) return combined.name;
  return value.trim() || null;
}

function parseCombinedNameLocation(value: string | null | undefined) {
  if (!value) return null;
  const cleaned = value.replace(/\*/g, "").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(.+?)\s*-\s*([1-9]\d{5})(?:\s*,\s*([A-Z]{2,3}|[A-Za-z ]+))?$/);
  if (!match) return null;

  const split = splitNameAndCity(match[1].trim());

  // Pure location line: "Hyderabad - 500001, TS" — no comma, ≤ 2 words, no company suffix.
  if (!split.city && split.name.split(/\s+/).filter(Boolean).length <= 2 && !looksLikeCompanyToken(split.name)) {
    return {
      raw: cleaned,
      name: null,
      contactName: null,
      city: split.name,
      state: normalizeIndiaState(match[3] ?? null),
      pincode: match[2],
    };
  }

  const contactCompany = splitContactAndCompany(split.name);
  return {
    raw: cleaned,
    name: contactCompany?.companyName ?? split.name,
    contactName: contactCompany?.contactName ?? null,
    city: split.city,
    state: normalizeIndiaState(match[3] ?? null),
    pincode: match[2],
  };
}

function cleanAddress(value: string | null | undefined, combinedRaw: string | undefined) {
  const cleaned = cleanSimpleValue(value);
  if (!cleaned || cleaned === combinedRaw) return null;
  return cleanLocationSuffix(cleaned) === cleaned ? cleaned : null;
}

function cleanSimpleValue(value: string | null | undefined) {
  return value?.replace(/\*/g, "").replace(/\s+/g, " ").trim() || null;
}

function looksLikeCompanyToken(value: string) {
  return /\b(?:pvt\.?\s*ltd\.?|private\s+limited|ltd\.?|llp|inc\.?|industries|enterprise|enterprises|traders|agro|organics|farm|farms|exports|imports|corporation|company|co\.?)\b/i.test(value);
}

function isIndiaMartCompanyValue(value: string | null | undefined) {
  const cleaned = cleanSimpleValue(value)?.toLowerCase() ?? "";
  return /indiamart\s+intermesh|assotech\s+business\s+cresterra|plot\s*no\.?\s*22|sec(?:tor)?\s*135|noida\s*-?\s*201305/.test(
    cleaned,
  );
}

function cleanCity(value: string | null | undefined) {
  const cleaned = cleanSimpleValue(value);
  if (!cleaned) return null;
  return cleaned
    .replace(/\s*-\s*[1-9]\d{5}.*$/, "")
    .replace(/\s*,\s*(?:[A-Z]{2,3}|[A-Za-z ]+)$/, "")
    .trim() || null;
}

function extractPincode(value: string | null | undefined) {
  return value?.match(/\b[1-9]\d{5}\b/)?.[0] ?? null;
}

export function normalizeIndiaState(value: string | null | undefined) {
  if (!value) return null;
  const cleaned = value
    .replace(/\*/g, "")
    .replace(/\b[1-9]\d{5}\b/g, "")
    .split(/[,\n-]/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .at(-1);
  if (!cleaned) return null;
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

export function splitContactAndCompany(value: string | null | undefined) {
  const cleaned = cleanSimpleValue(value);
  if (!cleaned) return null;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 4) return null;

  const suffixIndex = words.findIndex((word, index) => {
    const current = word.replace(/[.,]/g, "").toLowerCase();
    const next = words[index + 1]?.replace(/[.,]/g, "").toLowerCase();
    if (current === "pvt" && next === "ltd") return true;
    if (current === "private" && next === "limited") return true;
    return /^(?:ltd|llp|inc|industries|industry|enterprise|enterprises|traders|trader|agro|organics|exports|imports|corporation|company|co|farm|farms)$/.test(current);
  });
  if (suffixIndex < 0) return null;

  const companyStart = Math.max(0, suffixIndex - 1);
  const contactWords = words.slice(0, companyStart);
  if (contactWords.length < 2) return null;

  return {
    contactName: contactWords.join(" "),
    companyName: words.slice(companyStart).join(" "),
  };
}
