const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const USER_EMAIL_SCOPE = "https://www.googleapis.com/auth/userinfo.email";

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured.");
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleAuthUrl(state: string) {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", `${GMAIL_SEND_SCOPE} ${GMAIL_READONLY_SCOPE} ${USER_EMAIL_SCOPE}`);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description ?? "Could not connect Gmail.");
  return data as { access_token: string; refresh_token?: string };
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description ?? "Could not refresh Gmail access.");
  return data.access_token as string;
}

export async function getGoogleEmail(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok || typeof data?.email !== "string") {
    throw new Error("Could not read connected Google account email.");
  }
  return data.email as string;
}

export async function sendGmailMessage({
  accessToken,
  from,
  to,
  subject,
  body,
  attachments = [],
}: {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments?: { filename: string; contentType: string; base64: string }[];
}) {
  const raw = encodeBase64Url(buildMimeMessage({ from, to, subject, body, attachments }));

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Could not send email through Gmail.");
  return data as { id: string; threadId: string };
}

export type GmailThreadMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
};

export type GmailMessageListItem = {
  id: string;
  threadId: string;
};

export type GmailMessagePart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: {
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
};

export type GmailFullMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

export async function getGmailThread(accessToken: string, threadId: string) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`);
  url.searchParams.set("format", "metadata");
  url.searchParams.set("metadataHeaders", "From");
  url.searchParams.append("metadataHeaders", "Date");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Could not read Gmail thread.");
  return data as { id: string; messages?: GmailThreadMessage[] };
}

export async function searchGmailMessages(
  accessToken: string,
  query: string,
  maxResults = 20,
  pageToken?: string,
) {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(maxResults));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Could not search Gmail messages.");
  return data as { messages?: GmailMessageListItem[]; nextPageToken?: string; resultSizeEstimate?: number };
}

export async function getGmailMessage(accessToken: string, messageId: string) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`);
  url.searchParams.set("format", "full");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Could not read Gmail message.");
  return data as GmailFullMessage;
}

export function getHeader(message: GmailThreadMessage, headerName: string) {
  return (
    message.payload?.headers?.find((header) => header.name.toLowerCase() === headerName.toLowerCase())
      ?.value ?? ""
  );
}

export function getMessageHeader(message: GmailFullMessage, headerName: string) {
  return (
    message.payload?.headers?.find((header) => header.name.toLowerCase() === headerName.toLowerCase())
      ?.value ?? ""
  );
}

export function extractPlainTextFromGmailMessage(message: GmailFullMessage) {
  const plainParts: string[] = [];
  const htmlParts: string[] = [];
  collectBodyParts(message.payload, plainParts, htmlParts);

  const text = plainParts.join("\n").trim() || htmlParts.map(stripHtml).join("\n").trim();
  return text || message.snippet || "";
}

export function parseEmailAddress(value: string) {
  const match = value.match(/^(?:"?([^"<]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);
  if (!match) return { name: "", email: value.trim().toLowerCase() };
  return {
    name: (match[1] ?? "").trim(),
    email: (match[2] ?? value).trim().toLowerCase(),
  };
}

function buildMimeMessage({
  from,
  to,
  subject,
  body,
  attachments,
}: {
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments: { filename: string; contentType: string; base64: string }[];
}) {
  if (attachments.length === 0) {
    return [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodeMimeHeader(subject)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      body,
    ].join("\r\n");
  }

  const boundary = `azaterra_${Date.now().toString(36)}`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
  ];

  for (const attachment of attachments) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "",
      attachment.base64,
    );
  }

  lines.push(`--${boundary}--`);
  return lines.join("\r\n");
}

function collectBodyParts(part: GmailMessagePart | undefined, plainParts: string[], htmlParts: string[]) {
  if (!part) return;
  const decoded = part.body?.data ? decodeBase64Url(part.body.data) : "";
  if (decoded && part.mimeType === "text/plain") plainParts.push(decoded);
  if (decoded && part.mimeType === "text/html") htmlParts.push(decoded);
  for (const child of part.parts ?? []) collectBodyParts(child, plainParts, htmlParts);
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeMimeHeader(value: string) {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}
