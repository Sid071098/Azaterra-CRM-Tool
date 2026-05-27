import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import IndiaMartLeads from "@/components/IndiaMartLeads";

export const dynamic = "force-dynamic";

export default async function IndiaMartPage() {
  const session = readSession();
  if (!session) redirect("/login?next=/indiamart");

  const leads = await prisma.indiaMartLead.findMany({
    orderBy: [{ queryTime: "desc" }, { fetchedAt: "desc" }],
  });
  const hasApiKey = Boolean(process.env.INDIAMART_API_KEY?.trim());

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-brand-900">IndiaMART Leads</h1>
      <p className="mb-4 text-sm text-slate-600">
        {leads.length} {leads.length === 1 ? "lead" : "leads"} fetched from IndiaMART.
      </p>
      <IndiaMartLeads
        initialLeads={leads.map((l) => ({
          id: l.id,
          uniqueQueryId: l.uniqueQueryId,
          queryType: l.queryType,
          queryTime: l.queryTime ? l.queryTime.toISOString() : null,
          senderName: l.senderName,
          senderMobile: l.senderMobile,
          senderEmail: l.senderEmail,
          senderCompany: l.senderCompany,
          senderCity: l.senderCity,
          senderState: l.senderState,
          senderCountryIso: l.senderCountryIso,
          productName: l.productName,
          message: l.message,
          mcatName: l.mcatName,
          status: l.status,
          importedInquiryId: l.importedInquiryId,
          fetchedAt: l.fetchedAt.toISOString(),
        }))}
        hasApiKey={hasApiKey}
      />
    </div>
  );
}
