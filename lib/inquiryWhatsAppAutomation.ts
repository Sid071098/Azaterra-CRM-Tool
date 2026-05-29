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
  if (!isWhatsBoostConfigured()) return;

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
    return;
  }

  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: {
      notes: appendAutomationNote(inquiry.notes, `WhatsApp auto-message failed: ${result.error}`),
    },
  });
}

type IndiaMartLeadForWhatsApp = {
  id?: string;
  uniqueQueryId: string;
  senderName: string | null;
  senderMobile: string | null;
  senderMobileAlt?: string | null;
  senderCompany: string | null;
  productName: string | null;
  mcatName: string | null;
  message: string | null;
};

export async function sendIndiaMartLeadWhatsAppIfConfigured(lead: IndiaMartLeadForWhatsApp) {
  if (!isWhatsBoostConfigured()) return { attempted: false, ok: false, error: "WhatsBoost is not configured." };

  const result = await sendAutomaticNewLeadWhatsApp({
    id: lead.id ?? lead.uniqueQueryId,
    companyName: lead.senderCompany || lead.senderName || "IndiaMART lead",
    contactName: lead.senderName || "there",
    phone: lead.senderMobile || lead.senderMobileAlt || null,
    product: lead.productName || lead.mcatName || "your requirement",
    productNotes: lead.message || lead.productName || null,
    source: "IndiaMART",
  });

  return { attempted: true, ...result };
}

function appendAutomationNote(existing: string | null | undefined, note: string) {
  const line = `[${new Date().toLocaleString("en-IN")}] ${note}`;
  return existing?.trim() ? `${existing.trim()}\n\n${line}` : line;
}
