"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Ban, CheckCircle2, MailSearch, Mail } from "lucide-react";

type Lead = {
  id: string;
  uniqueQueryId: string;
  queryType: string | null;
  queryTime: string | null;
  senderName: string | null;
  senderMobile: string | null;
  senderEmail: string | null;
  senderCompany: string | null;
  senderCity: string | null;
  senderState: string | null;
  senderPincode: string | null;
  senderCountryIso: string | null;
  productName: string | null;
  message: string | null;
  mcatName: string | null;
  status: string;
  importedInquiryId: string | null;
  fetchedAt: string;
};

const QUERY_TYPE_LABEL: Record<string, string> = {
  W: "Direct",
  B: "BuyLead",
  P: "Phone",
};

type SyncWindow = "today" | "week" | "all";

const SYNC_WINDOW_LABELS: Record<SyncWindow, string> = {
  today: "Today's leads",
  week: "Last 7 days",
  all: "All Gmail leads",
};

export default function IndiaMartLeads({
  initialLeads,
  connectedGmail,
}: {
  initialLeads: Lead[];
  connectedGmail: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "New" | "Imported" | "Ignored">("New");
  const [q, setQ] = useState("");
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [syncWindow, setSyncWindow] = useState<SyncWindow>("week");

  const filtered = useMemo(() => {
    return initialLeads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = [
          l.senderName,
          l.senderCompany,
          l.senderEmail,
          l.senderMobile,
          l.productName,
          l.message,
          l.senderCity,
          l.senderCountryIso,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [initialLeads, statusFilter, q]);

  async function importLead(id: string) {
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/indiamart/${id}/import`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Import failed");
      router.push(`/inquiries/${data.inquiryId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
  }

  async function setStatus(id: string, status: "Ignored" | "New") {
    setError(null);
    try {
      const res = await fetch(`/api/indiamart/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead permanently?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/indiamart/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

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
      const newLeads: number = data.inserted ?? 0;
      const updatedLeads: number = data.updated ?? 0;
      const inquiriesCreated: number = data.inquiriesCreated ?? 0;
      const checked: number = data.checked ?? 0;
      const nonLeads: number = data.filtered ?? 0;
      const rangeLabel = SYNC_WINDOW_LABELS[(data.syncWindow as SyncWindow) ?? syncWindow].toLowerCase();
      if (newLeads === 0 && updatedLeads === 0) {
        setInfo(`No new leads found (${rangeLabel}). ${checked} emails scanned, ${nonLeads} non-IndiaMART filtered out.`);
      } else {
        const parts = [
          newLeads > 0 ? `${newLeads} new lead${newLeads === 1 ? "" : "s"} added` : null,
          updatedLeads > 0 ? `${updatedLeads} refreshed` : null,
          inquiriesCreated > 0 ? `${inquiriesCreated} ${inquiriesCreated === 1 ? "inquiry" : "inquiries"} created automatically` : null,
        ].filter(Boolean);
        setInfo(`${parts.join(", ")} (${rangeLabel} · ${checked} emails scanned)`);
      }
      setTimeout(() => router.refresh(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gmail sync failed");
    } finally {
      setSyncingGmail(false);
    }
  }

  return (
    <div>
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
      <div className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        {connectedGmail ? (
          <span>
            Gmail source connected: <strong>{connectedGmail}</strong>
          </span>
        ) : (
          <span>Connect Azaterracrop@gmail.com once, then use Check Gmail to import IndiaMART leads.</span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Search</label>
          <input
            className="input min-w-[260px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Company, contact, email, product…"
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="select min-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">All</option>
            <option value="New">New</option>
            <option value="Imported">Imported</option>
            <option value="Ignored">Ignored</option>
          </select>
        </div>
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

      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
            <tr>
              <Th>When</Th>
              <Th>Contact</Th>
              <Th>Company / Farm / Shop</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Location</Th>
              <Th>Product / Qty</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="border-b border-slate-200 p-8 text-center text-sm text-slate-500"
                >
                  No IndiaMART buyer leads yet. Connect Azaterracrop@gmail.com, choose a Gmail range, and use Fetch Leads.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 align-top">
                  <Td className="whitespace-nowrap text-xs text-slate-600">
                    {l.queryTime ? new Date(l.queryTime).toLocaleString() : "—"}
                  </Td>
                  <Td>
                    <div className="font-medium text-brand-900">{l.senderName || "Unknown"}</div>
                    <div className="mt-1">
                      <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-700">
                        {(l.queryType && QUERY_TYPE_LABEL[l.queryType]) || l.queryType || "Lead"}
                      </span>
                    </div>
                  </Td>
                  <Td className="font-medium text-slate-800">{l.senderCompany || "—"}</Td>
                  <Td className="text-xs text-slate-600">{l.senderEmail || "—"}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-600">{l.senderMobile || "—"}</Td>
                  <Td className="text-xs text-slate-600">
                    {[l.senderCity, l.senderState, l.senderPincode].filter(Boolean).join(", ") || "—"}
                  </Td>
                  <Td className="max-w-[240px]">
                    <div className="text-sm">{l.productName || l.mcatName || "—"}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">{l.message || ""}</div>
                  </Td>
                  <Td>
                    <StatusPill status={l.status} />
                    {l.status === "Imported" && l.importedInquiryId ? (
                      <Link
                        href={`/inquiries/${l.importedInquiryId}`}
                        className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-brand-700 hover:underline"
                      >
                        View inquiry <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1">
                      {l.status !== "Imported" ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-brand-200 bg-white px-2 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-50"
                          onClick={() => importLead(l.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Create Inquiry
                        </button>
                      ) : null}
                      {l.status === "New" ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                          onClick={() => setStatus(l.id, "Ignored")}
                          title="Hide this lead from the New list"
                        >
                          <Ban className="h-3 w-3" /> Ignore
                        </button>
                      ) : null}
                      {l.status === "Ignored" ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                          onClick={() => setStatus(l.id, "New")}
                        >
                          Restore
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded border border-rose-200 bg-white px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
                        onClick={() => deleteLead(l.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-300 px-3 py-2 font-semibold last:border-r-0">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b border-r border-slate-200 px-3 py-2 last:border-r-0 ${className}`}>
      {children}
    </td>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Imported"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "Ignored"
        ? "bg-slate-100 text-slate-600 ring-slate-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>
      {status}
    </span>
  );
}
