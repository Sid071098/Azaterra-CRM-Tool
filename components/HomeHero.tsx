import Link from "next/link";
import { PlusCircle, Users, Download } from "lucide-react";

export type HomeStats = {
  total: number;
  open: number;
  wonThisMonth: number;
  activeReps?: number;
  myOpen?: number;
};

export default function HomeHero({
  role,
  name,
  stats,
}: {
  role: "Owner" | "SalesRep";
  name: string;
  stats: HomeStats;
}) {
  const firstName = name.split(" ")[0] || name;
  const isOwner = role === "Owner";

  const items = isOwner
    ? [
        { label: "Total", value: stats.total },
        { label: "Open", value: stats.open },
        { label: "Payments this month", value: stats.wonThisMonth },
        { label: "Active reps", value: stats.activeReps ?? 0 },
      ]
    : [
        { label: "Your open", value: stats.myOpen ?? stats.open },
        { label: "Your total", value: stats.total },
        { label: "Payments this month", value: stats.wonThisMonth },
        { label: "Team open", value: stats.open },
      ];

  return (
    <section className="fade-up mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h1 className="font-display text-base font-semibold text-brand-900">
          {greetingFor()}, {firstName}.
        </h1>
        <ul className="flex flex-wrap items-center gap-1.5 text-xs">
          {items.map((it) => (
            <li
              key={it.label}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5"
            >
              <span className="font-semibold text-brand-900">{it.value}</span>
              <span className="text-[11px] text-muted">{it.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href="/inquiries/new"
          className="inline-flex items-center rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          <PlusCircle className="mr-1 h-3.5 w-3.5" /> New Inquiry
        </Link>
        <Link
          href="/inquiries"
          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          All Inquiries
        </Link>
        {isOwner ? (
          <>
            <Link
              href="/team"
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Users className="mr-1 h-3.5 w-3.5" /> Team
            </Link>
            <a
              href="/api/inquiries/export"
              download
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              title="Download a CSV of inquiries created in the last 30 days"
            >
              <Download className="mr-1 h-3.5 w-3.5" /> Export
            </a>
          </>
        ) : null}
      </div>
    </section>
  );
}

function greetingFor() {
  const hourStr = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const h = parseInt(hourStr, 10);
  if (Number.isNaN(h)) return "Hello";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
