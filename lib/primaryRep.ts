import { prisma } from "@/lib/db";

export async function getPrimarySalesPersonId(): Promise<string | null> {
  const primary = await prisma.salesPerson.findFirst({
    where: { status: "Active" },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true },
  });
  return primary?.id ?? null;
}
