"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";

export type PaymentReminder = {
  id: string;
  companyName: string;
  paymentStatus: string | null;
  paymentDueAt: string | Date;
  lastPaymentReminderAt: string | Date | null;
};

export default function PaymentReminders({ items }: { items: PaymentReminder[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function snooze(id: string) {
    setBusyId(id);
    await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastPaymentReminderAt: new Date().toISOString() }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function markReceived(id: string) {
    setBusyId(id);
    await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentStatus: "Received",
        paymentReceivedAt: new Date().toISOString(),
      }),
    });
    setBusyId(null);
    router.refresh();
  }

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-amber-900">
        <AlertCircle className="h-4 w-4" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Payment follow-ups overdue ({items.length})
        </h2>
      </div>
      <p className="mb-3 text-xs text-amber-800">
        Payment hasn&apos;t been received past the due date. We&apos;ll surface this every 3 days
        until you mark it received or snooze.
      </p>
      <ul className="divide-y divide-amber-200/70 rounded-lg border border-amber-200 bg-white">
        {items.map((it) => {
          const due = new Date(it.paymentDueAt);
          const daysOverdue = Math.max(
            0,
            Math.floor((Date.now() - due.getTime()) / (24 * 60 * 60 * 1000)),
          );
          return (
            <li
              key={it.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/inquiries/${it.id}`}
                  className="truncate text-sm font-semibold text-brand-900 hover:text-brand-700 hover:underline"
                >
                  {it.companyName}
                </Link>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-800">
                  <Clock3 className="h-3 w-3" />
                  Due {due.toLocaleDateString()} · {daysOverdue} day
                  {daysOverdue === 1 ? "" : "s"} overdue
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  onClick={() => markReceived(it.id)}
                  disabled={busyId === it.id}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark received
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => snooze(it.id)}
                  disabled={busyId === it.id}
                  title="Hide for 3 days"
                >
                  Snooze 3d
                </button>
                <Link
                  href={`/inquiries/${it.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
