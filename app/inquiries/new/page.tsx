import { prisma } from "@/lib/db";
import NewInquiryRouter from "@/components/inquiry/NewInquiryRouter";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewInquiryPage() {
  const appSession = readSession();

  const configured = isSupabaseConfigured();
  const sessionUser = configured ? await getSessionUser() : null;

  const team = await prisma.salesPerson.findMany({
    where: { status: "Active" },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return (
    <NewInquiryRouter
      supabaseConfigured={configured}
      sessionUser={sessionUser}
      appRole={appSession?.role ?? "SalesRep"}
      appName={appSession?.name ?? null}
      appSalesPersonId={appSession?.salesPersonId ?? null}
      team={team.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
      }))}
    />
  );
}
