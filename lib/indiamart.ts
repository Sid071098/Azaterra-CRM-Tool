// IndiaMART Pull API integration.
// Docs (premium): https://seller.indiamart.com/bltf/?prc=lmsapi
// Endpoint shape used here matches the v2 CRM listing JSON.

const API_ROOT = "https://mapi.indiamart.com/wservce/crm/crmListing/v2/";

export type IndiaMartRawLead = {
  UNIQUE_QUERY_ID?: string;
  QUERY_TYPE?: string;
  QUERY_TIME?: string;
  SENDER_NAME?: string;
  SENDER_MOBILE?: string;
  SENDER_EMAIL?: string;
  SENDER_COMPANY?: string;
  SENDER_ADDRESS?: string;
  SENDER_CITY?: string;
  SENDER_STATE?: string;
  SENDER_PINCODE?: string;
  SENDER_COUNTRY_ISO?: string;
  SENDER_MOBILE_ALT?: string;
  SENDER_EMAIL_ALT?: string;
  QUERY_PRODUCT_NAME?: string;
  QUERY_MESSAGE?: string;
  QUERY_MCAT_NAME?: string;
  CALL_DURATION?: string;
  RECEIVER_MOBILE?: string;
  [k: string]: unknown;
};

export type IndiaMartResponse = {
  CODE?: number;
  STATUS?: string;
  MESSAGE?: string;
  TOTAL_RECORDS?: number;
  RESPONSE?: IndiaMartRawLead[];
};

// Format Date as DD-Mon-YYYYHH:MM:SS (IndiaMART expected format).
function formatDate(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${day}-${month}-${year}${time}`;
}

export async function fetchIndiaMartLeads(opts: {
  apiKey: string;
  start: Date;
  end: Date;
}): Promise<IndiaMartResponse> {
  const url = new URL(API_ROOT);
  url.searchParams.set("glusr_crm_key", opts.apiKey);
  url.searchParams.set("start_time", formatDate(opts.start));
  url.searchParams.set("end_time", formatDate(opts.end));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`IndiaMART API returned ${res.status}`);
  }
  const data = (await res.json()) as IndiaMartResponse;
  return data;
}

// Map a raw lead to the columns we store. Returns null if no UNIQUE_QUERY_ID.
export function normalizeLead(raw: IndiaMartRawLead) {
  if (!raw.UNIQUE_QUERY_ID) return null;
  let queryTime: Date | null = null;
  if (raw.QUERY_TIME) {
    const parsed = new Date(raw.QUERY_TIME.replace(" ", "T"));
    if (!Number.isNaN(parsed.getTime())) queryTime = parsed;
  }
  return {
    uniqueQueryId: raw.UNIQUE_QUERY_ID,
    queryType: raw.QUERY_TYPE ?? null,
    queryTime,
    senderName: raw.SENDER_NAME ?? null,
    senderMobile: raw.SENDER_MOBILE ?? null,
    senderEmail: raw.SENDER_EMAIL ?? null,
    senderCompany: raw.SENDER_COMPANY ?? null,
    senderAddress: raw.SENDER_ADDRESS ?? null,
    senderCity: raw.SENDER_CITY ?? null,
    senderState: raw.SENDER_STATE ?? null,
    senderPincode: raw.SENDER_PINCODE ?? null,
    senderCountryIso: raw.SENDER_COUNTRY_ISO ?? null,
    senderMobileAlt: raw.SENDER_MOBILE_ALT ?? null,
    senderEmailAlt: raw.SENDER_EMAIL_ALT ?? null,
    productName: raw.QUERY_PRODUCT_NAME ?? null,
    message: raw.QUERY_MESSAGE ?? null,
    mcatName: raw.QUERY_MCAT_NAME ?? null,
    callDuration: raw.CALL_DURATION ?? null,
    receiverMobile: raw.RECEIVER_MOBILE ?? null,
    rawJson: JSON.stringify(raw),
  };
}

export function sampleLeads(): IndiaMartRawLead[] {
  const now = new Date();
  const hoursAgo = (h: number) => {
    const d = new Date(now);
    d.setHours(d.getHours() - h);
    return d.toISOString().replace("T", " ").slice(0, 19);
  };
  return [
    {
      UNIQUE_QUERY_ID: "DEMO-IM-001",
      QUERY_TYPE: "W",
      QUERY_TIME: hoursAgo(3),
      SENDER_NAME: "Rakesh Sharma",
      SENDER_MOBILE: "+91 98200 11122",
      SENDER_EMAIL: "rakesh@bharatagrochem.in",
      SENDER_COMPANY: "Bharat Agrochem Pvt Ltd",
      SENDER_CITY: "Pune",
      SENDER_STATE: "Maharashtra",
      SENDER_COUNTRY_ISO: "IN",
      QUERY_PRODUCT_NAME: "Cold Pressed Neem Oil 1500ppm",
      QUERY_MESSAGE: "Looking for 500L sample for trial; min 1500ppm azadirachtin.",
      QUERY_MCAT_NAME: "Neem Oil",
    },
    {
      UNIQUE_QUERY_ID: "DEMO-IM-002",
      QUERY_TYPE: "B",
      QUERY_TIME: hoursAgo(11),
      SENDER_NAME: "Ana Lopes",
      SENDER_MOBILE: "+55 11 4002-8922",
      SENDER_EMAIL: "ana.lopes@verdebio.com.br",
      SENDER_COMPANY: "Verde Bio Insumos",
      SENDER_CITY: "São Paulo",
      SENDER_COUNTRY_ISO: "BR",
      QUERY_PRODUCT_NAME: "Karanja Oil — 200L drums",
      QUERY_MESSAGE: "Need quote for 10 MT Karanja oil, monthly shipments to Santos port.",
      QUERY_MCAT_NAME: "Karanja Oil",
    },
    {
      UNIQUE_QUERY_ID: "DEMO-IM-003",
      QUERY_TYPE: "P",
      QUERY_TIME: hoursAgo(29),
      SENDER_NAME: "Tom Walker",
      SENDER_MOBILE: "+1 415 555 0119",
      SENDER_EMAIL: "tom@greenfields-us.com",
      SENDER_COMPANY: "Greenfields Organics",
      SENDER_CITY: "Davis",
      SENDER_STATE: "California",
      SENDER_COUNTRY_ISO: "US",
      QUERY_PRODUCT_NAME: "Neem cake & oil bundle",
      QUERY_MESSAGE: "Interested in OMRI-certified neem cake + oil for organic distribution.",
      QUERY_MCAT_NAME: "Neem Cake",
      CALL_DURATION: "00:04:11",
    },
  ];
}
