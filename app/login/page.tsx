import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { OWNER_PROFILES } from "@/lib/owners";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = readSession();
  if (session) redirect(searchParams.next || "/");

  const [team, ownerPins] = await Promise.all([
    prisma.salesPerson.findMany({
      where: { status: "Active" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.ownerPin.findMany({ select: { ownerId: true } }),
  ]);

  const ownersWithPin = ownerPins.map((p) => p.ownerId);

  return (
    <LoginForm
      next={searchParams.next}
      team={team}
      owners={OWNER_PROFILES}
      ownersWithPin={ownersWithPin}
    />
  );
}
