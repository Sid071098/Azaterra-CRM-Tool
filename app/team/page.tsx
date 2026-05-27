import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import SalesTeamManager from "@/components/SalesTeamManager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = readSession();
  if (session?.role !== "Owner") redirect("/");

  const people = await prisma.salesPerson.findMany({
    orderBy: [{ status: "asc" }, { firstName: "asc" }],
    include: { _count: { select: { inquiries: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-900">Manage Sales Team</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add reps, deactivate ones who&apos;ve moved on. Only active reps appear on the sign-in
          screen.
        </p>
      </div>
      <SalesTeamManager
        initialPeople={people.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          status: p.status as "Active" | "Inactive",
          isPrimary: false,
          inquiryCount: p._count.inquiries,
        }))}
      />
    </div>
  );
}
