import { prisma } from "@/lib/db";
import {
  isWhatsBoostConfigured,
  sendAutomaticNewLeadWhatsApp,
} from "@/lib/whatsboost";

type InquiryForWhatsApp = {
  id: string;
  companyName: string;
  contactName: string;
  phone: string | null;
  product: string;
  productNotes?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  source?: string | null;
  notes?: string | null;
};

export async function sendNewLeadWhatsAppIfConfigured(inquiry: InquiryForWhatsApp) {
  if (!isWhatsBoostConfigured()) return { attempted: false, ok: false, error: "WhatsBoost is not configured." };
  if (hasAutomationNote(inquiry.notes, "WhatsApp auto-message sent")) {
    return { attempted: false, ok: false, error: "WhatsApp auto-message was already sent." };
  }

  const result = await sendAutomaticNewLeadWhatsApp(inquiry);
  const now = new Date();

  if (result.ok) {
    await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: {
        stage: "Contacted",
        lastContactedAt: now,
        notes: appendAutomationNote(
          inquiry.notes,
          `WhatsApp auto-message sent${result.providerMessageId ? ` (${result.providerMessageId})` : ""}.`,
        ),
      },
    });
    return { attempted: true, ...result };
  }

  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: {
      notes: appendAutomationNote(inquiry.notes, `WhatsApp auto-message failed: ${result.error}`),
    },
  });
  return { attempted: true, ...result };
}

function appendAutomationNote(existing: string | null | undefined, note: string) {
  const line = `[${new Date().toLocaleString("en-IN")}] ${note}`;
  return existing?.trim() ? `${existing.trim()}\n\n${line}` : line;
}

function hasAutomationNote(existing: string | null | undefined, marker: string) {
  return Boolean(existing?.toLowerCase().includes(marker.toLowerCase()));
}
