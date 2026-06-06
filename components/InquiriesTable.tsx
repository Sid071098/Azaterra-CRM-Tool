"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  PAYMENT_STATUS_LABELS,
  PRODUCTS,
  SAMPLE_DECISION_LABELS,
  STAGES,
  STAGE_COLORS,
  STAGE_LABELS,
} from "@/lib/options";
import { readOrderDetails } from "@/lib/orderDetails";
import { readOrderStatusDetails } from "@/lib/orderStatusDetails";
import { readOrderSentDetails } from "@/lib/orderSentDetails";
import { readPaymentDetails } from "@/lib/paymentDetails";
import { readSampleDetails } from "@/lib/sampleDetails";
import { cleanIndiaMartContactFields } from "@/lib/indiaContactCleanup";
import { readIndiaMartOrderDetails } from "@/lib/indiaMartOrderDetails";
import { Archive, RotateCcw, Pencil, Trash2, UserPlus, X } from "lucide-react";

type Inquiry = {
  id: string;
  createdAt: string | Date;
  companyName: string;
  contactName: string;
  country: string;
  city: string | null;
  customerType: string;
  source: string;
  product: string;
  productNotes: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  packaging: string | null;
  stage: string;
  estimatedValue: number | null;
  currency: string | null;
  assignedTo: string | null;
  salesPersonId: string | null;
  salesPersonName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  nextActionNote: string | null;
  regulatoryNotes: string | null;
  sampleDecision: string | null;
  paymentStatus: string | null;
  paymentDueAt: string | Date | null;
  paymentReceivedAt: string | Date | null;
  isArchived?: boolean;
  deletedAt?: string | Date | null;
  deletedBy?: string | null;
};

type TeamMember = { id: string; name: string };

export default function InquiriesTable({
  inquiries,
  team,
  current,
  readOnly = false,
  canDelete = false,
  archivedView = false,
}: {
  inquiries: Inquiry[];
  team: TeamMember[];
  current: { stage?: string; product?: string; origin?: string; q?: string; rep?: string };
  readOnly?: boolean;
  canDelete?: boolean;
  archivedView?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewingInquiry, setViewingInquiry] = useState<Inquiry | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const allSelected = inquiries.length > 0 && selectedIds.length === inquiries.length;
  const partiallySelected = selectedIds.length > 0 && !allSelected;
  const basePath = archivedView ? "/inquiries/archived" : "/inquiries";
  const colSpan = archivedView ? 11 : 10;

  async function assignRep(id: string, salesPersonId: string | null) {
    setOpenId(null);
    await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salesPersonId }),
    });
    router.refresh();
  }

  function setFilter(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.push(`${basePath}?${sp.toString()}`);
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? inquiries.map((i) => i.id) : []);
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((currentIds) =>
      checked ? Array.from(new Set([...currentIds, id])) : currentIds.filter((cur) => cur !== id),
    );
  }

  async function archiveSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Archive ${selectedIds.length} selected inquiries? They will be hidden from active dashboards but kept for analysis.`)) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryIds: selectedIds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not archive selected inquiries.");
      setSelectedIds([]);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not archive selected inquiries.");
    } finally {
      setDeleting(false);
    }
  }

  async function restoreInquiry(id: string) {
    const res = await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: false }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Could not restore inquiry.");
      return;
    }
    router.refresh();
  }

  async function permanentlyDeleteInquiry(id: string) {
    if (!confirm("Permanently delete this archived lead? This removes it from CRM storage completely.")) return;

    const res = await fetch(`/api/inquiries/${id}?permanent=true`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Could not permanently delete inquiry.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 card-soft py-3">
        <FilterInput
          label="Search"
          value={current.q ?? ""}
          onChange={(v) => setFilter("q", v)}
          placeholder="Company, contact, email…"
        />
        <FilterSelect
          label="Stage"
          value={current.stage ?? ""}
          onChange={(v) => setFilter("stage", v)}
          options={STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
        />
        <FilterSelect
          label="Product"
          value={current.product ?? ""}
          onChange={(v) => setFilter("product", v)}
          options={PRODUCTS.map((p) => ({ value: p, label: p }))}
        />
        <FilterSelect
          label="Inquiry Source"
          value={current.origin ?? ""}
          onChange={(v) => setFilter("origin", v)}
          options={[
            { value: "IndiaMART", label: "IndiaMART" },
            { value: "SalesRep", label: "SalesRep" },
          ]}
        />
        <FilterSelect
          label="Sales Rep"
          value={current.rep ?? ""}
          onChange={(v) => setFilter("rep", v)}
          options={team.map((t) => ({ value: t.id, label: t.name }))}
        />
        {(current.q || current.stage || current.product || current.origin || current.rep) && (
          <button className="btn-ghost" onClick={() => router.push(basePath)}>
            Clear
          </button>
        )}
      </div>

      {!archivedView && (canDelete || !readOnly) && selectedIds.length > 0 ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm font-medium text-slate-800">{selectedIds.length} selected</p>
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                disabled={selectedIds.length !== 1 || deleting}
                title={
                  selectedIds.length === 1
                    ? "Edit this inquiry"
                    : "Select a single inquiry to edit"
                }
                onClick={() => {
                  if (selectedIds.length === 1) {
                    router.push(`/inquiries/${selectedIds[0]}`);
                  }
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                disabled={deleting}
                onClick={archiveSelected}
              >
                <Archive className="h-4 w-4" />
                {deleting ? "Archiving…" : `Archive Selected (${selectedIds.length})`}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
            <tr>
              {!archivedView ? (
                <th className="w-10 border-b border-r border-slate-300 px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-700"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = partiallySelected;
                    }}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Select all inquiries on this page"
                  />
                </th>
              ) : null}
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th>Country</Th>
              <Th>Type</Th>
              <Th>Product</Th>
              <Th>Qty</Th>
              <Th>Sales Rep</Th>
              <Th>Stage</Th>
              {archivedView ? <Th>Archived</Th> : null}
              <Th>Created</Th>
              {archivedView ? <Th>Action</Th> : null}
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="border-b border-slate-200 p-8 text-center text-sm text-slate-500">
                  No inquiries match.
                </td>
              </tr>
            ) : (
              inquiries.map((i) => {
                const displayContact = getDisplayContact(i);
                return (
                  <tr key={i.id} className="hover:bg-slate-50">
                    {!archivedView ? (
                      <Td className="border-r border-slate-200">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-700"
                          checked={selectedIds.includes(i.id)}
                          onChange={(e) => toggleOne(i.id, e.target.checked)}
                          aria-label={`Select inquiry for ${displayContact.companyName}`}
                        />
                      </Td>
                    ) : null}
                    <Td>
                      <button
                        type="button"
                        className="text-left font-medium text-brand-700 hover:underline"
                        onClick={() => setViewingInquiry(i)}
                      >
                        {displayContact.companyName}
                      </button>
                    </Td>
                    <Td>{displayContact.contactName}</Td>
                    <Td>{i.country}</Td>
                    <Td className="text-slate-600">{i.customerType}</Td>
                    <Td className="text-slate-600">{i.product}</Td>
                    <Td className="text-slate-600">
                      {i.quantity ? `${i.quantity} ${i.quantityUnit ?? ""}` : "—"}
                    </Td>
                    <Td>
                      <RepCell
                        inquiry={i}
                        team={team}
                        readOnly={readOnly}
                        open={openId === i.id}
                        onToggle={() => setOpenId((cur) => (cur === i.id ? null : i.id))}
                        onAssign={(spId) => assignRep(i.id, spId)}
                      />
                    </Td>
                    <Td>
                      <span
                        className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium ${STAGE_COLORS[i.stage]}`}
                      >
                        {STAGE_LABELS[i.stage] ?? i.stage}
                      </span>
                    </Td>
                    {archivedView ? (
                      <Td className="text-xs text-slate-500">
                        {i.deletedAt ? new Date(i.deletedAt).toLocaleDateString() : "—"}
                        {i.deletedBy ? <span className="block">by {i.deletedBy}</span> : null}
                      </Td>
                    ) : null}
                    <Td className="text-xs text-slate-500">
                      {new Date(i.createdAt).toLocaleDateString()}
                    </Td>
                    {archivedView ? (
                      <Td>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                            onClick={() => restoreInquiry(i.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </button>
                          {canDelete ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                              onClick={() => permanentlyDeleteInquiry(i.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </Td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {viewingInquiry ? (
        <InquiryViewModal
          inquiry={viewingInquiry}
          onClose={() => setViewingInquiry(null)}
          onEdit={
            readOnly
              ? undefined
              : () => {
                  router.push(`/inquiries/${viewingInquiry.id}`);
                }
          }
        />
      ) : null}
    </div>
  );
}

function getDisplayContact(inquiry: Inquiry) {
  if (inquiry.source !== "IndiaMART") {
    return {
      companyName: inquiry.companyName,
      contactName: inquiry.contactName,
      city: inquiry.city,
    };
  }
  const cleaned = cleanIndiaMartContactFields(inquiry);
  return {
    companyName: cleaned.companyName ?? inquiry.companyName,
    contactName:
      cleaned.contactName ??
      (inquiry.contactName === (cleaned.companyName ?? inquiry.companyName) ? "Unknown" : inquiry.contactName),
    city: cleaned.city,
  };
}

function InquiryViewModal({
  inquiry,
  onClose,
  onEdit,
}: {
  inquiry: Inquiry;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const displayContact = getDisplayContact(inquiry);
  const orderDetails = readIndiaMartOrderDetails(inquiry);
  const sample = readSampleDetails(inquiry.notes);
  const order = readOrderDetails(inquiry.notes);
  const orderStatus = readOrderStatusDetails(inquiry.notes);
  const orderSent = readOrderSentDetails(inquiry.notes);
  const payment = readPaymentDetails(inquiry.notes);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/35 px-4 py-8">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-xl border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              Inquiry view
            </p>
            <h2 className="mt-1 text-xl font-semibold text-brand-950">{displayContact.companyName}</h2>
            <p className="text-sm text-slate-600">
              {displayContact.contactName} · {inquiry.phone || "No phone"} · {inquiry.email || "No email"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onEdit ? (
              <button
                type="button"
                className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                onClick={onEdit}
              >
                Edit full record
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
              onClick={onClose}
              aria-label="Close inquiry details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1.1fr]">
          <section className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                Current stage details
              </h3>
              <span
                className={`rounded border px-2 py-1 text-[11px] font-medium ${STAGE_COLORS[inquiry.stage] ?? "border-slate-200 bg-white text-slate-700"}`}
              >
                {STAGE_LABELS[inquiry.stage] ?? inquiry.stage}
              </span>
            </div>
            {inquiry.stage === "SampleSent" ? (
              <StageBox title="Sample" tone="amber">
                <Info label="Status" value={inquiry.sampleDecision ? SAMPLE_DECISION_LABELS[inquiry.sampleDecision] ?? inquiry.sampleDecision : "—"} />
                <Info label="Product" value={sample.product || "—"} />
                <Info label="Quantity" value={sample.quantity ? `${sample.quantity} ${sample.unit}` : "—"} />
              </StageBox>
            ) : inquiry.stage === "OrderReceived" ? (
              <StageBox title="Order Received" tone="teal">
                <Info label="Amount" value={order.amount || "—"} />
                <Info label="Product" value={order.product || "—"} />
                <Info label="Advance payment" value={order.advancePaymentRequired ? "Required" : "Not required"} />
              </StageBox>
            ) : inquiry.stage === "OrderStatus" ? (
              <StageBox title="Order Status" tone="sky">
                <Info label="Status" value={orderStatus.status || "—"} />
                <Info label="Invoice" value={orderStatus.invoiceName || "—"} />
                <Info label="Notes" value={orderStatus.notes || "—"} />
              </StageBox>
            ) : inquiry.stage === "OrderSent" ? (
              <StageBox title="Order Sent" tone="cyan">
                <Info label="Sent date" value={orderSent.dispatchDate || "—"} />
                <Info label="Dispatch method" value={orderSent.dispatchMethod || "—"} />
                <Info label="Sent by" value={orderSent.sentBy || "—"} />
                <Info label="Tracking / LR" value={orderSent.trackingDetails || "—"} />
              </StageBox>
            ) : inquiry.stage === "Won" ? (
              <StageBox title="Payment" tone="emerald">
                <Info label="Status" value={inquiry.paymentStatus ? PAYMENT_STATUS_LABELS[inquiry.paymentStatus] ?? inquiry.paymentStatus : "—"} />
                <Info label="Amount received" value={payment.amount || "—"} />
                <Info label="Method" value={payment.method || "—"} />
                <Info
                  label="Due / received"
                  value={[
                    inquiry.paymentDueAt ? `Due ${new Date(inquiry.paymentDueAt).toLocaleDateString()}` : "",
                    inquiry.paymentReceivedAt ? `Received ${new Date(inquiry.paymentReceivedAt).toLocaleDateString()}` : "",
                  ].filter(Boolean).join(" · ") || "—"}
                />
              </StageBox>
            ) : (
              <StageBox title={STAGE_LABELS[inquiry.stage] ?? inquiry.stage} tone="slate">
                <p className="text-sm text-slate-700">No extra details saved for this stage.</p>
              </StageBox>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Buyer details
            </h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Info label="Contact" value={displayContact.contactName} />
              <Info label="Company" value={displayContact.companyName} />
              <Info label="Phone" value={inquiry.phone || "—"} />
              <Info label="Email" value={inquiry.email || "—"} />
              <Info label="Country" value={inquiry.country} />
              <Info label="Address / city" value={displayContact.city || "—"} />
              <Info label="Customer type" value={inquiry.customerType} />
              <Info label="Sales rep" value={inquiry.salesPersonName || inquiry.assignedTo || "Unassigned"} />
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Order details
            </h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Info label="Product name" value={orderDetails.productName || "—"} />
              <Info label="Quantity" value={orderDetails.quantity || "—"} />
              <Info label="Packaging size" value={orderDetails.packagingSize || "—"} />
              <Info label="Product form" value={orderDetails.productForm || "—"} />
              <Info label="Concentration" value={orderDetails.concentration || "—"} />
              <Info label="Grade" value={orderDetails.grade || "—"} />
              <Info label="Probable order value" value={orderDetails.probableOrderValue || "—"} />
              <Info label="Product category" value={inquiry.product} />
              <Info label="Next action" value={inquiry.nextActionNote || "—"} />
            </dl>
          </section>

          <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Notes
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{inquiry.notes || "—"}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function StageBox({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "amber" | "teal" | "sky" | "cyan" | "emerald" | "slate";
  children: React.ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    amber: "border-amber-200 bg-amber-50/60",
    teal: "border-teal-200 bg-teal-50/60",
    sky: "border-sky-200 bg-sky-50/60",
    cyan: "border-cyan-200 bg-cyan-50/60",
    emerald: "border-emerald-200 bg-emerald-50/60",
    slate: "border-slate-200 bg-slate-50/70",
  };

  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
        {title}
      </h4>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-words font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input min-w-[220px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="select min-w-[160px]" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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

function RepCell({
  inquiry,
  team,
  readOnly,
  open,
  onToggle,
  onAssign,
}: {
  inquiry: Inquiry;
  team: TeamMember[];
  readOnly: boolean;
  open: boolean;
  onToggle: () => void;
  onAssign: (salesPersonId: string | null) => void;
}) {
  const label = inquiry.salesPersonName || inquiry.assignedTo;
  return (
    <div className="relative inline-flex items-center gap-2">
      {label ? (
        <span className="text-slate-700">{label}</span>
      ) : (
        <span className="italic text-slate-400">Unassigned</span>
      )}
      {readOnly ? null : (
        <>
          <button
            type="button"
            className="inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50"
            onClick={onToggle}
          >
            <UserPlus className="mr-0.5 h-3 w-3" /> {label ? "Reassign" : "Assign"}
          </button>
          {open ? (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-48 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {team.length === 0 ? (
                <div className="px-2 py-2 text-xs text-slate-500">No active reps yet</div>
              ) : (
                <>
                  {inquiry.salesPersonId ? (
                    <button
                      type="button"
                      className="block w-full px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => onAssign(null)}
                    >
                      Unassign
                    </button>
                  ) : null}
                  {team.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-slate-100 ${
                        m.id === inquiry.salesPersonId ? "bg-brand-50 text-brand-800" : ""
                      }`}
                      onClick={() => onAssign(m.id)}
                    >
                      {m.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
