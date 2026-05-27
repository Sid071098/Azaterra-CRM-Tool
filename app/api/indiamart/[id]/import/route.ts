import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getPrimarySalesPersonId } from "@/lib/primaryRep";

const CUSTOMER_TYPE_DEFAULT = "Distributor";

function inferProduct(productName: string | null, mcatName: string | null): string {
  const hay = `${productName ?? ""} ${mcatName ?? ""}`.toLowerCase();
  if (hay.includes("karanja") || hay.includes("pongamia")) return "Karanja/Pongamia Oil (Cold Press)";
  if (hay.includes("neem")) return "Neem Oil (Cold Press)";
  if (hay.includes("custom")) return "Custom Formulation";
  return "Other";
}

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
    return NextResponse.json(
      { error: "This lead is already imported", inquiryId: lead.importedInquiryId },
      { status: 409 },
    );
  }

  const salesPersonId =
    session.role === "SalesRep" && session.salesPersonId
      ? session.salesPersonId
      : await getPrimarySalesPersonId();
  const inquiry = await prisma.inquiry.create({
    data: {
      companyName: lead.senderCompany || lead.senderName || "Unknown (IndiaMART)",
      contactName: lead.senderName || "Unknown",
      email: lead.senderEmail || lead.senderEmailAlt || null,
      phone: lead.senderMobile || lead.senderMobileAlt || null,
      country: lead.senderCountryIso === "IN" ? "India" : lead.senderCountryIso || "Unknown",
      city: lead.senderCity || null,
      customerType: CUSTOMER_TYPE_DEFAULT,
      source: "IndiaMART",
      product: inferProduct(lead.productName, lead.mcatName),
      productNotes: lead.productName || null,
      notes: lead.message || null,
      stage: "New",
      salesPersonId,
      createdByRole: session.role,
      createdByName: session.name,
    },
  });

  await prisma.indiaMartLead.update({
    where: { id: lead.id },
    data: {
      status: "Imported",
      importedAt: new Date(),
      importedInquiryId: inquiry.id,
    },
  });

  return NextResponse.json({ ok: true, inquiryId: inquiry.id });
}
