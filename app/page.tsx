import { prisma } from "@/lib/db";
import Pipeline from "@/components/Pipeline";
import HomeHero from "@/components/HomeHero";
import PaymentReminders from "@/components/PaymentReminders";
import { readSession } from "@/lib/session";
import { ensureInquiryArchiveColumns } from "@/lib/archiveSchema";

export const dynamic = "force-dynamic";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default async function PipelinePage() {
  await ensureInquiryArchiveColumns();
  const session = readSession();
  const isOwner = session?.role === "Owner";
  const myId = session?.salesPersonId ?? null;
  const mineFilter = !isOwner && myId ? { salesPersonId: myId } : undefined;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - THREE_DAYS_MS);

  const [
    inquiries,
    total,
    open,
    wonThisMonth,
    activeReps,
    myOpen,
    myTotal,
    myWon,
    paymentReminders,
  ] = await Promise.all([
    prisma.inquiry.findMany({
      where: { isArchived: false },
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
    prisma.inquiry.count({ where: { isArchived: false } }),
    prisma.inquiry.count({ where: { isArchived: false, stage: { notIn: ["Won", "Lost"] } } }),
    prisma.inquiry.count({ where: { isArchived: false, stage: "Won", updatedAt: { gte: startOfMonth } } }),
    isOwner ? prisma.salesPerson.count({ where: { status: "Active" } }) : Promise.resolve(0),
    mineFilter
      ? prisma.inquiry.count({ where: { ...mineFilter, isArchived: false, stage: { notIn: ["Won", "Lost"] } } })
      : Promise.resolve(0),
    mineFilter ? prisma.inquiry.count({ where: { ...mineFilter, isArchived: false } }) : Promise.resolve(0),
    mineFilter
      ? prisma.inquiry.count({
          where: { ...mineFilter, isArchived: false, stage: "Won", updatedAt: { gte: startOfMonth } },
        })
      : Promise.resolve(0),
    mineFilter
      ? prisma.inquiry.findMany({
          where: {
            ...mineFilter,
            isArchived: false,
            paymentDueAt: { lt: now },
            paymentStatus: { not: "Received" },
            OR: [
              { lastPaymentReminderAt: null },
              { lastPaymentReminderAt: { lt: threeDaysAgo } },
            ],
          },
          select: {
            id: true,
            companyName: true,
            paymentStatus: true,
            paymentDueAt: true,
            lastPaymentReminderAt: true,
          },
          orderBy: { paymentDueAt: "asc" },
        })
      : Promise.resolve([] as Array<{
          id: string;
          companyName: string;
          paymentStatus: string | null;
          paymentDueAt: Date | null;
          lastPaymentReminderAt: Date | null;
        }>),
  ]);

  const stats = isOwner
    ? { total, open, wonThisMonth, activeReps }
    : {
        total: myId ? myTotal : total,
        open: myId ? myOpen : open,
        wonThisMonth: myId ? myWon : wonThisMonth,
        myOpen: myId ? myOpen : open,
      };

  const reminderItems = paymentReminders
    .filter((r): r is typeof r & { paymentDueAt: Date } => r.paymentDueAt !== null)
    .map((r) => ({
      id: r.id,
      companyName: r.companyName,
      paymentStatus: r.paymentStatus,
      paymentDueAt: r.paymentDueAt.toISOString(),
      lastPaymentReminderAt: r.lastPaymentReminderAt
        ? r.lastPaymentReminderAt.toISOString()
        : null,
    }));

  return (
    <div>
      <HomeHero
        role={isOwner ? "Owner" : "SalesRep"}
        name={session?.name ?? "there"}
        stats={stats}
      />
      {!isOwner ? <PaymentReminders items={reminderItems} /> : null}
      <div className="mb-2 flex items-end justify-between">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-brand-700">
          Sales Pipeline
        </h2>
        <span className="text-[11px] text-muted">Click a buyer to view or update</span>
      </div>
      <Pipeline inquiries={inquiries} />
    </div>
  );
}
