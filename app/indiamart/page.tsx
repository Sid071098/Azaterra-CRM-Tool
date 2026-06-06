import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getOwnerGmail } from "@/lib/ownerGmail";
import Pipeline, { type PipelineInquiry } from "@/components/Pipeline";
import IndiaMartLeads from "@/components/IndiaMartLeads";
import { cleanIndiaMartContactFields, formatIndiaMartBuyerIdentity } from "@/lib/indiaContactCleanup";
import { isUnnecessaryIndiaMartInquiry } from "@/lib/indiamartLeadFilters";

export const dynamic = "force-dynamic";

export default async function IndiaMartPage() {
  const session = readSession();
  if (!session) redirect("/login?next=/indiamart");

  let inquiries: PipelineInquiry[] = [];
  let leads: React.ComponentProps<typeof IndiaMartLeads>["initialLeads"] = [];
  let loadError: string | null = null;
  let connectedGmail: string | null = null;

  try {
    const [rows, gmailLeadLinks, rawLeads, account] = await Promise.all([
      prisma.inquiry.findMany({
        where: { isArchived: false, source: "IndiaMART" },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          assignedTo: true,
          salesPerson: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          stage: true,
          sampleDecision: true,
          paymentStatus: true,
          paymentReceivedAt: true,
          notes: true,
          email: true,
          phone: true,
          product: true,
          productNotes: true,
          quantity: true,
          quantityUnit: true,
          packaging: true,
        },
      }),
      prisma.indiaMartLead.findMany({
        where: {
          importedInquiryId: { not: null },
          rawJson: { contains: "gmail_message_id" },
        },
        select: { importedInquiryId: true },
      }),
      prisma.indiaMartLead.findMany({
        orderBy: [{ queryTime: "desc" }, { fetchedAt: "desc" }],
        take: 300,
        select: {
          id: true,
          uniqueQueryId: true,
          queryType: true,
          queryTime: true,
          senderName: true,
          senderMobile: true,
          senderEmail: true,
          senderCompany: true,
          senderCity: true,
          senderState: true,
          senderPincode: true,
          senderCountryIso: true,
          productName: true,
          message: true,
          mcatName: true,
          status: true,
          importedInquiryId: true,
          fetchedAt: true,
        },
      }),
      session.role === "Owner"
        ? getOwnerGmail(session.ownerId)
        : session.salesPersonId
          ? prisma.salesPerson.findUnique({
              where: { id: session.salesPersonId },
              select: { googleEmail: true },
            })
          : null,
    ]);

    const gmailInquiryIds = new Set(gmailLeadLinks.map((lead) => lead.importedInquiryId).filter(Boolean));
    inquiries = rows
      .filter((row) => gmailInquiryIds.has(row.id))
      .filter((row) => !isUnnecessaryIndiaMartInquiry(row))
      .map((row) => {
        const cleaned = cleanIndiaMartContactFields({
          companyName: row.companyName,
          contactName: row.contactName,
        });
        const companyName = cleaned.companyName || row.companyName;
        return {
          ...row,
          companyName: formatIndiaMartBuyerIdentity({
            companyName,
            contactName: row.contactName,
          }),
          contactName:
            cleaned.contactName ||
            (row.contactName === companyName || isUnnecessaryIndiaMartInquiry({ contactName: row.contactName })
              ? "Unknown"
              : row.contactName),
        };
      });

    leads = rawLeads.map((l) => ({
      ...l,
      queryTime: l.queryTime?.toISOString() ?? null,
      fetchedAt: l.fetchedAt.toISOString(),
    }));

    connectedGmail = account?.googleEmail ?? null;
  } catch (err) {
    console.error("Could not load IndiaMART pipeline", err);
    loadError =
      "The CRM could not reach the database right now. Please check the Neon database status/connection and refresh this page.";
  }

  const newCount = leads.filter((l) => l.status === "New").length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-brand-900">IndiaMART Leads</h1>
      <p className="mb-4 text-sm text-slate-600">
        {leads.length > 0
          ? `${leads.length} total leads — ${newCount} new, ${inquiries.length} in pipeline`
          : "Connect Gmail and fetch leads to start importing IndiaMART buyer inquiries."}
      </p>

      {loadError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      ) : (
        <>
          <IndiaMartLeads initialLeads={leads} connectedGmail={connectedGmail} />

          {inquiries.length > 0 && (
            <div className="mt-8">
              <div className="mb-2 flex items-end justify-between">
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-brand-700">
                  Imported Inquiries Pipeline
                </h2>
                <span className="text-[11px] text-muted">Click a buyer to view or update</span>
              </div>
              <Pipeline
                inquiries={inquiries}
                detailFrom="indiamart"
                emptyMessage="No IndiaMART inquiries yet."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
