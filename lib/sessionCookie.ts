// Edge-safe session cookie helpers. No Next.js or Node imports — middleware
// runs on the Edge runtime and cannot transitively import `next/headers`.

export type AppRole = "Owner" | "SalesRep";

export type AppSession = {
  role: AppRole;
  name: string;
  salesPersonId?: string | null;
  ownerId?: string | null;
};

export const SESSION_COOKIE = "azaterra.session";

export function parseSessionCookie(raw: string | undefined | null): AppSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.role !== "Owner" && parsed?.role !== "SalesRep") return null;
    return {
      role: parsed.role as AppRole,
      name: typeof parsed.name === "string" && parsed.name.length > 0 ? parsed.name : parsed.role,
      salesPersonId:
        typeof parsed.salesPersonId === "string" && parsed.salesPersonId.length > 0
          ? parsed.salesPersonId
          : null,
      ownerId:
        typeof parsed.ownerId === "string" && parsed.ownerId.length > 0 ? parsed.ownerId : null,
    };
  } catch {
    return null;
  }
}

export function serializeSession(s: AppSession): string {
  return JSON.stringify({
    role: s.role,
    name: s.name,
    salesPersonId: s.salesPersonId ?? null,
    ownerId: s.ownerId ?? null,
  });
}
