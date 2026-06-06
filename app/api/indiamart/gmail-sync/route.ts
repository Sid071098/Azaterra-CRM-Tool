import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  syncIndiaMartLeadsFromGmailAccount,
  type IndiaMartGmailSyncWindow,
} from "@/lib/indiamartGmailSync";
import { getOwnerGmail } from "@/lib/ownerGmail";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = readSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to sync IndiaMART leads from Gmail." }, { status: 403 });
  }

  const account =
    session.role === "Owner"
      ? await getOwnerGmail(session.ownerId)
      : session.salesPersonId
        ? await prisma.salesPerson.findUnique({ where: { id: session.salesPersonId } })
        : null;

  const email = account?.googleEmail;
  const refreshToken = account?.googleRefreshToken;
  if (!email || !refreshToken) {
    return NextResponse.json({ error: "Connect Gmail before syncing IndiaMART leads." }, { status: 400 });
  }

  try {
    const syncWindow = await readSyncWindow(req);
    const result = await syncIndiaMartLeadsFromGmailAccount({
      email,
      refreshToken,
      salesPersonId: session.role === "SalesRep" ? session.salesPersonId ?? null : null,
      ownerId: session.role === "Owner" ? session.ownerId ?? null : null,
    }, { syncWindow });
    return NextResponse.json({ ok: true, syncWindow, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not sync IndiaMART leads from Gmail.";
    const reconnect = message.toLowerCase().includes("insufficient") || message.toLowerCase().includes("scope");
    return NextResponse.json(
      {
        error: reconnect
          ? "Reconnect Gmail so CRM can read IndiaMART lead emails."
          : message,
        reconnect,
      },
      { status: reconnect ? 400 : 502 },
    );
  }
}

async function readSyncWindow(req: Request): Promise<IndiaMartGmailSyncWindow> {
  try {
    const body = await req.json();
    const value = typeof body?.syncWindow === "string" ? body.syncWindow : "";
    if (value === "today" || value === "week" || value === "all") return value;
  } catch {
    // Empty body is fine; default to the safer recent window.
  }
  return "week";
}
