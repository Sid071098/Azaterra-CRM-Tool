import { prisma } from "@/lib/db";
import InquiriesTable from "@/components/InquiriesTable";
import ArchivedDeleteAllButton from "@/components/ArchivedDeleteAllButton";
import { readSession } from "@/lib/session";
import { ensureInquiryArchiveColumns } from "@/lib/archiveSchema";

export const dynamic = "force-dynamic";

export default async function ArchivedInquiriesPage({
  searchParams,
}: {
  searchParams: { stage?: string; product?: string; origin?: string; q?: string; rep?: string };
}) {
  await ensureInquiryArchiveColumns();
  const session = readSession();
  const readOnly = session?.role === "Owner";
  const canDelete = session?.role === "Owner" || session?.role === "SalesRep";

  const where: Record<string, unknown> = { isArchived: true };
  if (searchParams.stage) where.stage = searchParams.stage;
  if (searchParams.product) where.product = searchParams.product;
  if (searchParams.origin === "IndiaMART") where.source = "IndiaMART";
  if (searchParams.origin === "SalesRep") where.source = { not: "IndiaMART" };
  if (searchParams.rep) where.salesPersonId = searchParams.rep;
  if (searchParams.q) {
    where.OR = [
      { companyName: { contains: searchParams.q } },
      { contactName: { contains: searchParams.q } },
      { email: { contains: searchParams.q } },
      { country: { contains: searchParams.q } },
    ];
  }

  const [inquiries, team] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: { salesPerson: true },
      orderBy: [{ deletedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.salesPerson.findMany({
      where: { status: "Active" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-brand-900">Archived Leads</h1>
          <p className="text-sm text-slate-600">
            {inquiries.length} archived records preserved for review and analysis. Delete removes them completely.
          </p>
        </div>
        {canDelete ? <ArchivedDeleteAllButton count={inquiries.length} /> : null}
      </div>
      <InquiriesTable
        inquiries={inquiries.map((i) => ({
          ...i,
          salesPersonName: i.salesPerson
            ? `${i.salesPerson.firstName} ${i.salesPerson.lastName}`
            : null,
        }))}
        team={team.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` }))}
        current={searchParams}
        readOnly={readOnly}
        canDelete={canDelete}
        archivedView
      />
    </div>
  );
}
