import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import InquiryDetail from "@/components/InquiryDetail";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InquiryDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { from?: string };
}) {
  const [inquiry, team] = await Promise.all([
    prisma.inquiry.findUnique({
      where: { id: params.id },
      include: { salesPerson: true },
    }),
    prisma.salesPerson.findMany({
      where: { status: "Active" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  if (!inquiry) notFound();
  const session = readSession();
  const canDelete = session?.role === "Owner" || session?.role === "SalesRep";
  const isOwner = session?.role === "Owner";
  const returnHref =
    searchParams?.from === "pipeline" ? "/" : searchParams?.from === "indiamart" ? "/indiamart" : "/inquiries";
  const returnLabel =
    searchParams?.from === "pipeline"
      ? "Manual Inquiry"
      : searchParams?.from === "indiamart"
        ? "IndiaMART Inquiry"
        : "All inquiries";
  return (
    <InquiryDetail
      inquiry={{
        ...inquiry,
        salesPersonName: inquiry.salesPerson
          ? `${inquiry.salesPerson.firstName} ${inquiry.salesPerson.lastName}`
          : null,
      }}
      team={team.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` }))}
      isOwner={isOwner}
      canDelete={canDelete}
      returnHref={returnHref}
      returnLabel={returnLabel}
    />
  );
}
