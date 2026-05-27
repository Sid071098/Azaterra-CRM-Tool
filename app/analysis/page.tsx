import { prisma } from "@/lib/db";
import { STAGES, STAGE_LABELS } from "@/lib/options";
import Link from "next/link";
import { ensureInquiryArchiveColumns } from "@/lib/archiveSchema";

export const dynamic = "force-dynamic";

const ACTIVE_STAGES = new Set(["New", "Contacted", "SampleSent", "OrderReceived", "OrderStatus", "OrderSent"]);

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams?: { archive?: string };
}) {
  await ensureInquiryArchiveColumns();
  const archiveMode = searchParams?.archive === "active"
    ? "active"
    : searchParams?.archive === "archived"
      ? "archived"
      : "all";
  const where =
    archiveMode === "active"
      ? { isArchived: false }
      : archiveMode === "archived"
        ? { isArchived: true }
        : undefined;

  const inquiries = await prisma.inquiry.findMany({
    where,
    include: { salesPerson: true },
    orderBy: { createdAt: "asc" },
  });

  const total = inquiries.length;
  const archived = inquiries.filter((i) => i.isArchived).length;
  const paymentStage = inquiries.filter((i) => i.stage === "Won").length;
  const lost = inquiries.filter((i) => i.stage === "Lost").length;
  const active = inquiries.filter((i) => ACTIVE_STAGES.has(i.stage)).length;
  const withFollowUp = inquiries.filter((i) => Boolean(i.nextActionAt)).length;
  const conversionRate = percent(paymentStage, total);
  const lossRate = percent(lost, total);
  const followUpRate = percent(withFollowUp, total);

  const stageData = STAGES.map((stage) => ({
    label: STAGE_LABELS[stage] ?? stage,
    value: inquiries.filter((i) => i.stage === stage).length,
  }));
  const sourceData = topBreakdown(inquiries.map((i) => i.source || "Unknown"), 6);
  const productData = topBreakdown(inquiries.map((i) => i.product || "Unknown"), 7);
  const repData = topBreakdown(
    inquiries.map((i) =>
      i.salesPerson
        ? `${i.salesPerson.firstName} ${i.salesPerson.lastName}`.trim()
        : i.assignedTo || "Unassigned",
    ),
    8,
  );
  const monthlyData = lastMonths(6).map((month) => ({
    label: month.label,
    value: inquiries.filter((i) => monthKey(new Date(i.createdAt)) === month.key).length,
  }));

  const paymentPending = inquiries.filter(
    (i) => i.stage === "Won" && i.paymentStatus !== "Received",
  ).length;
  const readyOrders = inquiries.filter(
    (i) => i.stage === "OrderStatus" && i.notes?.includes("Order status details: Order ready"),
  ).length;
  const samplePending = inquiries.filter(
    (i) => i.stage === "SampleSent" && i.sampleDecision === "SampleRequiredPending",
  ).length;
  const insights = [
    active > paymentStage ? `${active} active leads are still moving through the sales pipeline.` : "",
    paymentPending ? `${paymentPending} payment-stage deals still need payment follow-up.` : "",
    readyOrders ? `${readyOrders} orders are ready and should be pushed to dispatch.` : "",
    samplePending ? `${samplePending} sample requests are waiting to be sent.` : "",
    conversionRate >= 25 ? `Lead-to-payment-stage conversion is healthy at ${conversionRate}%.` : "",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-700">
            CRM intelligence
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-brand-950">Lead Analysis</h1>
          <p className="mt-1 text-sm text-slate-600">
            Performance summary across inquiries, stages, sources, products, and sales reps.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ArchiveFilter active={archiveMode} value="all" label="All history" />
          <ArchiveFilter active={archiveMode} value="active" label="Active only" />
          <ArchiveFilter active={archiveMode} value="archived" label="Archived only" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Metric label="Total leads" value={total.toString()} hint={`${active} active`} />
        <Metric label="Archived" value={archived.toString()} hint="retained history" tone="slate" />
        <Metric label="Payment stage" value={paymentStage.toString()} hint={`${conversionRate}% conversion`} tone="emerald" />
        <Metric label="Lost deals" value={lost.toString()} hint={`${lossRate}% loss rate`} tone="rose" />
        <Metric label="Follow-ups set" value={`${followUpRate}%`} hint={`${withFollowUp} leads`} tone="amber" />
        <Metric label="Payment pending" value={paymentPending.toString()} hint="payment not received" tone="sky" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Pipeline Funnel">
          <div className="space-y-3">
            {stageData.map((item) => (
              <BarRow key={item.label} label={item.label} value={item.value} max={total || 1} />
            ))}
          </div>
        </Panel>

        <Panel title="Action Signals">
          {insights.length ? (
            <div className="space-y-2">
              {insights.map((item) => (
                <div key={item} className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-950">
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No urgent signals yet. Pipeline is quiet.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Monthly Lead Volume">
          <ColumnChart items={monthlyData} />
        </Panel>
        <Panel title="Top Products">
          <RankList items={productData} total={total} />
        </Panel>
        <Panel title="Lead Sources">
          <RankList items={sourceData} total={total} />
        </Panel>
      </div>

      <Panel title="Sales Rep Ownership">
        <div className="grid gap-3 md:grid-cols-2">
          {repData.map((item) => {
            const repLeads = inquiries.filter((i) => {
              const name = i.salesPerson
                ? `${i.salesPerson.firstName} ${i.salesPerson.lastName}`.trim()
                : i.assignedTo || "Unassigned";
              return name === item.label;
            });
            const repWon = repLeads.filter((i) => i.stage === "Won").length;
            return (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-brand-950">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.value} leads owned</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-emerald-700">{repWon}</div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">payment</div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(4, percent(repWon, item.value))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "brand" | "emerald" | "rose" | "amber" | "sky" | "slate";
}) {
  const colors = {
    brand: "text-brand-950 bg-white",
    emerald: "text-emerald-800 bg-emerald-50",
    rose: "text-rose-800 bg-rose-50",
    amber: "text-amber-800 bg-amber-50",
    sky: "text-sky-800 bg-sky-50",
    slate: "text-slate-800 bg-slate-50",
  };
  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${colors[tone]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function ArchiveFilter({
  active,
  value,
  label,
}: {
  active: "all" | "active" | "archived";
  value: "all" | "active" | "archived";
  label: string;
}) {
  const href = value === "all" ? "/analysis" : `/analysis?archive=${value}`;
  const selected = active === value;
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
        selected
          ? "border-brand-300 bg-brand-700 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-brand-950">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ColumnChart({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex h-44 items-end gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="text-xs font-semibold text-brand-950">{item.value}</div>
          <div className="flex h-28 w-full items-end rounded bg-slate-50 px-1">
            <div
              className="w-full rounded-t bg-emerald-500"
              style={{ height: `${Math.max(4, Math.round((item.value / max) * 100))}%` }}
            />
          </div>
          <div className="text-[10px] font-medium text-slate-500">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function RankList({ items, total }: { items: Array<{ label: string; value: number }>; total: number }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">{item.label}</span>
            <span className="font-semibold text-brand-950">{item.value}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(4, percent(item.value, total))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function topBreakdown(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function percent(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count })
    .map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
      return {
        key: monthKey(date),
        label: date.toLocaleDateString("en-US", { month: "short" }),
      };
    });
}
