import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { ensureEmailReplyTables } from "@/lib/emailReplySchema";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureEmailReplyTables();
  const session = readSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to update replies." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const isHandled = Boolean(body.isHandled);
  const reply = await prisma.emailReply.update({
    where: { id: params.id },
    data: {
      isHandled,
      handledAt: isHandled ? new Date() : null,
      handledBy: isHandled ? session.name : null,
    },
  });
  return NextResponse.json({ ok: true, reply });
}
