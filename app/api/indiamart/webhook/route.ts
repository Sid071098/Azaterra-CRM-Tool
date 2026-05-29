import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeWebhookLead, type IndiaMartWebhookPayload } from "@/lib/indiamart";
import { sendIndiaMartLeadWhatsAppIfConfigured } from "@/lib/inquiryWhatsAppAutomation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.INDIAMART_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "INDIAMART_WEBHOOK_SECRET is not configured on the server." },
      { status: 500 },
    );
  }

  const provided =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("x-indiamart-secret") ??
    new URL(req.url).searchParams.get("secret");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payloads: IndiaMartWebhookPayload[] = Array.isArray(body)
    ? (body as IndiaMartWebhookPayload[])
    : [body as IndiaMartWebhookPayload];

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let whatsappSent = 0;
  let whatsappFailed = 0;

  for (const p of payloads) {
    const norm = normalizeWebhookLead(p);
    if (!norm) {
      skipped++;
      continue;
    }
    const existing = await prisma.indiaMartLead.findUnique({
      where: { uniqueQueryId: norm.uniqueQueryId },
    });
    if (existing) {
      await prisma.indiaMartLead.update({
        where: { uniqueQueryId: norm.uniqueQueryId },
        data: { ...norm, fetchedAt: new Date() },
      });
      updated++;
    } else {
      const lead = await prisma.indiaMartLead.create({ data: norm });
      inserted++;
      const whatsapp = await sendIndiaMartLeadWhatsAppIfConfigured(lead);
      if (whatsapp.attempted) {
        if (whatsapp.ok) whatsappSent++;
        else whatsappFailed++;
      }
    }
  }

  return NextResponse.json({ ok: true, inserted, updated, skipped, whatsappSent, whatsappFailed });
}
