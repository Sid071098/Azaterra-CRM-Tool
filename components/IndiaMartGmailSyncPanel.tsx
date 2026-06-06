"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, MailSearch } from "lucide-react";

type SyncWindow = "today" | "week" | "all";

const SYNC_WINDOW_LABELS: Record<SyncWindow, string> = {
  today: "Today's leads",
  week: "Last 7 days",
  all: "All Gmail leads",
};

export default function IndiaMartGmailSyncPanel({
  connectedGmail,
}: {
  connectedGmail: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [syncWindow, setSyncWindow] = useState<SyncWindow>("week");

  async function syncFromGmail() {
    setError(null);
    setInfo(null);
    setSyncingGmail(true);
    try {
      const res = await fetch("/api/indiamart/gmail-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncWindow }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gmail sync failed");
      setInfo(
        `${SYNC_WINDOW_LABELS[data.syncWindow as SyncWindow] ?? SYNC_WINDOW_LABELS[syncWindow]}: checked ${data.checked ?? 0} Gmail messages, ${data.inserted ?? 0} new, ${data.updated ?? 0} refreshed, ${data.inquiriesCreated ?? 0} inquiries created, ${data.filtered ?? 0} unwanted filtered, ${data.skipped ?? 0} skipped.`,
      );
      setTimeout(() => router.refresh(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gmail sync failed");
    } finally {
      setSyncingGmail(false);
    }
  }

  return (
    <section className="mb-4 rounded-md border border-slate-200 bg-white p-3">
      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {info}
        </p>
      ) : null}
      <div className="mb-3 text-sm text-slate-700">
        {connectedGmail ? (
          <span>
            Gmail source connected: <strong>{connectedGmail}</strong>
          </span>
        ) : (
          <span>Connect Azaterracrop@gmail.com once, then use Fetch Leads to import IndiaMART buyer inquiries.</span>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Fetch from Gmail</label>
          <select
            className="select min-w-[170px]"
            value={syncWindow}
            onChange={(e) => setSyncWindow(e.target.value as SyncWindow)}
          >
            <option value="today">Today&apos;s leads</option>
            <option value="week">Last 7 days</option>
            <option value="all">All Gmail leads</option>
          </select>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={syncFromGmail}
          disabled={syncingGmail || !connectedGmail}
          title={connectedGmail ? `Search connected Gmail for ${SYNC_WINDOW_LABELS[syncWindow].toLowerCase()}` : "Connect Gmail before checking for IndiaMART leads"}
        >
          <MailSearch className="h-4 w-4" />
          {syncingGmail ? "Checking Gmail..." : "Fetch Leads"}
        </button>
        <Link
          href="/api/email/google/connect?next=/indiamart"
          className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Mail className="h-4 w-4" />
          {connectedGmail ? "Reconnect Gmail" : "Connect Gmail"}
        </Link>
      </div>
    </section>
  );
}
