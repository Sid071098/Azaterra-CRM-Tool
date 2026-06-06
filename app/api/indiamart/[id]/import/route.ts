import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getPrimarySalesPersonId } from "@/lib/primaryRep";
import { createInquiryFromIndiaMartLead } from "@/lib/indiamartInquiry";
import { sendNewLeadWhatsAppIfConfigured } from "@/lib/inquiryWhatsAppAutomation";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lead = await prisma.indiaMartLead.findUnique({ where: { id: params.id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (lead.importedInquiryId) {
    const importedInquiry = await prisma.inquiry.findUnique({
      where: { id: lead.importedInquiryId },
      select: { id: true, isArchived: true },
    });
    if (importedInquiry && !importedInquiry.isArchived) {
      return NextResponse.json(
        { error: "This lead is already imported", inquiryId: importedInquiry.id },
        { status: 409 },
      );
    }
  }

  const salesPersonId =
    session.role === "SalesRep" && session.salesPersonId
      ? session.salesPersonId
      : await getPrimarySalesPersonId();
  const result = await createInquiryFromIndiaMartLead(lead, {
    salesPersonId,
    createdByRole: session.role,
    createdByName: session.name,
  });
  const whatsapp = result.inquiry ? await sendNewLeadWhatsAppIfConfigured(result.inquiry) : null;
  return NextResponse.json({
    ok: true,
    inquiryId: result.inquiryId,
    whatsapp: whatsapp
      ? { attempted: whatsapp.attempted, ok: whatsapp.ok, error: whatsapp.ok ? undefined : whatsapp.error }
      : { attempted: false },
  });
}
