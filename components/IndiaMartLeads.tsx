"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, FlaskConical, ArrowRight, Trash2, Ban, CheckCircle2 } from "lucide-react";

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

export default function IndiaMartLeads({
  initialLeads,
  hasApiKey,
}: {
  initialLeads: Lead[];
  hasApiKey: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sync" | "sample" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "New" | "Imported" | "Ignored">("New");
  const [q, setQ] = useState("");

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

  async function callSync(useSample: boolean) {
    setError(null);
    setInfo(null);
    setBusy(useSample ? "sample" : "sync");
    try {
      const res = await fetch("/api/indiamart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useSample, lookbackDays: 7 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sync failed");
      setInfo(
        `${useSample ? "Demo data loaded" : "Synced from IndiaMART"} — ${data.inserted} new, ${data.updated} updated.`,
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={busy !== null}
          onClick={() => callSync(false)}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${busy === "sync" ? "animate-spin" : ""}`} />
          {busy === "sync" ? "Syncing…" : "Sync from IndiaMART"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          disabled={busy !== null}
          onClick={() => callSync(true)}
        >
          <FlaskConical className={`h-4 w-4 ${busy === "sample" ? "animate-pulse" : ""}`} />
          {busy === "sample" ? "Loading…" : "Load demo data"}
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
              hasApiKey
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
            }`}
          >
            {hasApiKey ? "API key configured" : "INDIAMART_API_KEY not set"}
          </span>
        </div>
      </div>

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
      </div>

      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
            <tr>
              <Th>When</Th>
              <Th>Type</Th>
              <Th>Contact</Th>
              <Th>Company</Th>
              <Th>Location</Th>
              <Th>Product</Th>
              <Th>Message</Th>
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
                  No IndiaMART leads yet. Click <b>Load demo data</b> to preview, or{" "}
                  <b>Sync from IndiaMART</b> once your API key is set in <code>.env</code>.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 align-top">
                  <Td className="whitespace-nowrap text-xs text-slate-600">
                    {l.queryTime ? new Date(l.queryTime).toLocaleString() : "—"}
                  </Td>
                  <Td>
                    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-700">
                      {(l.queryType && QUERY_TYPE_LABEL[l.queryType]) || l.queryType || "—"}
                    </span>
                  </Td>
                  <Td>
                    <div className="font-medium text-brand-900">{l.senderName || "—"}</div>
                    <div className="text-xs text-slate-500">{l.senderEmail || ""}</div>
                    <div className="text-xs text-slate-500">{l.senderMobile || ""}</div>
                  </Td>
                  <Td>{l.senderCompany || "—"}</Td>
                  <Td className="text-xs text-slate-600">
                    {[l.senderCity, l.senderState, l.senderCountryIso].filter(Boolean).join(", ") || "—"}
                  </Td>
                  <Td className="max-w-[200px]">
                    <div className="text-sm">{l.productName || l.mcatName || "—"}</div>
                  </Td>
                  <Td className="max-w-[280px] text-xs text-slate-600">
                    <div className="line-clamp-3">{l.message || "—"}</div>
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
