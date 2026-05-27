import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getOwnerGmail } from "@/lib/ownerGmail";
import { syncUnreadRepliesForAccount } from "@/lib/emailReplySync";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = readSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to sync email replies." }, { status: 403 });
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
    return NextResponse.json({ error: "Connect Gmail before syncing replies." }, { status: 400 });
  }

  try {
    const result = await syncUnreadRepliesForAccount({
      email,
      refreshToken,
      salesPersonId: session.role === "SalesRep" ? session.salesPersonId ?? null : null,
      ownerId: session.role === "Owner" ? session.ownerId ?? null : null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not sync Gmail replies.";
    const reconnect = message.toLowerCase().includes("insufficient") || message.toLowerCase().includes("scope");
    return NextResponse.json(
      {
        error: reconnect
          ? "Reconnect Gmail so CRM can read unread replies as well as send email."
          : message,
        reconnect,
      },
      { status: reconnect ? 400 : 502 },
    );
  }
}
