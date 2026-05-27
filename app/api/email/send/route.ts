import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshAccessToken, sendGmailMessage } from "@/lib/gmail";
import { readSession } from "@/lib/session";
import { getOwnerGmail } from "@/lib/ownerGmail";
import { ensureEmailReplyTables } from "@/lib/emailReplySchema";

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(req: NextRequest) {
  await ensureEmailReplyTables();
  const session = readSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to send email." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  const attachments = Array.isArray(body.attachments)
    ? body.attachments
        .filter((item): item is Record<string, unknown> => item && typeof item === "object")
        .map((item) => ({
          filename: typeof item.filename === "string" ? item.filename : "invoice",
          contentType: typeof item.contentType === "string" ? item.contentType : "application/octet-stream",
          base64: typeof item.base64 === "string" ? item.base64 : "",
        }))
        .filter((item) => item.base64)
    : [];

  if (!inquiryId || !subject || !messageBody) {
    return NextResponse.json({ error: "inquiryId, subject and body are required." }, { status: 400 });
  }

  const [salesPerson, ownerGmail, inquiry] = await Promise.all([
    session.role === "SalesRep" && session.salesPersonId
      ? prisma.salesPerson.findUnique({ where: { id: session.salesPersonId } })
      : Promise.resolve(null),
    session.role === "Owner" ? getOwnerGmail(session.ownerId) : Promise.resolve(null),
    prisma.inquiry.findUnique({ where: { id: inquiryId } }),
  ]);

  if (session.role === "SalesRep" && !salesPerson) {
    return NextResponse.json({ error: "Sales rep not found." }, { status: 404 });
  }
  if (!inquiry) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  if (!inquiry.email) {
    return NextResponse.json({ error: "Customer email is missing on this inquiry." }, { status: 400 });
  }
  const sender =
    session.role === "Owner"
      ? ownerGmail
        ? {
            name: session.name,
            email: ownerGmail.googleEmail,
            refreshToken: ownerGmail.googleRefreshToken,
          }
        : null
      : salesPerson?.googleRefreshToken && salesPerson.googleEmail
        ? {
            name: `${salesPerson.firstName} ${salesPerson.lastName}`.trim(),
            email: salesPerson.googleEmail,
            refreshToken: salesPerson.googleRefreshToken,
          }
        : null;

  if (!sender) {
    return NextResponse.json({ error: "Connect Gmail before sending email." }, { status: 400 });
  }

  try {
    const accessToken = await refreshAccessToken(sender.refreshToken);
    const result = await sendGmailMessage({
      accessToken,
      from: `${sender.name} <${sender.email}>`,
      to: inquiry.email,
      subject,
      body: messageBody,
      attachments,
    });

    await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: {
        stage: inquiry.stage === "New" ? "Contacted" : inquiry.stage,
        lastContactedAt: new Date(),
      },
    });

    await prisma.sentEmail.upsert({
      where: { gmailMessageId: result.id },
      create: {
        id: id("sent"),
        inquiryId: inquiry.id,
        salesPersonId: session.role === "SalesRep" ? session.salesPersonId ?? null : null,
        ownerId: session.role === "Owner" ? session.ownerId ?? null : null,
        actorRole: session.role,
        fromEmail: sender.email,
        toEmail: inquiry.email,
        subject,
        gmailMessageId: result.id,
        gmailThreadId: result.threadId,
        sentAt: new Date(),
      },
      update: {
        inquiryId: inquiry.id,
        subject,
        gmailThreadId: result.threadId,
        fromEmail: sender.email,
        toEmail: inquiry.email,
      },
    });

    return NextResponse.json({ ok: true, messageId: result.id, threadId: result.threadId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email." },
      { status: 502 },
    );
  }
}
