"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CUSTOMER_TYPES,
  PRODUCTS,
  SOURCES,
  PACKAGING,
  UNITS,
  STAGES,
  STAGE_LABELS,
} from "@/lib/options";

type InquiryInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  customerType: string;
  source: string;
  product: string;
  productNotes: string;
  quantity: string;
  quantityUnit: string;
  packaging: string;
  stage: string;
  expectedCloseAt: string;
  estimatedValue: string;
  currency: string;
  assignedTo: string;
  nextActionAt: string;
  nextActionNote: string;
  notes: string;
  regulatoryNotes: string;
};

const empty: InquiryInput = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  customerType: "Distributor",
  source: "Website",
  product: PRODUCTS[0],
  productNotes: "",
  quantity: "",
  quantityUnit: "L",
  packaging: "",
  stage: "New",
  expectedCloseAt: "",
  estimatedValue: "",
  currency: "USD",
  assignedTo: "",
  nextActionAt: "",
  nextActionNote: "",
  notes: "",
  regulatoryNotes: "",
};

export default function InquiryForm({ initial }: { initial?: Partial<InquiryInput> }) {
  const router = useRouter();
  const [form, setForm] = useState<InquiryInput>({ ...empty, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof InquiryInput>(key: K, value: InquiryInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Section title="Contact">
        <Grid>
          <Field label="Company *">
            <input
              className="input"
              required
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="e.g. Green Fields Agro"
            />
          </Field>
          <Field label="Contact Name *">
            <input
              className="input"
              required
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
              placeholder="e.g. Rajiv Mehta"
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="name@company.com"
            />
          </Field>
          <Field label="Phone / WhatsApp">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+91 ..."
            />
          </Field>
          <Field label="Country *">
            <input
              className="input"
              required
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              placeholder="e.g. Spain"
            />
          </Field>
          <Field label="City / Region">
            <input
              className="input"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Classification">
        <Grid>
          <Field label="Customer Type">
            <select
              className="select"
              value={form.customerType}
              onChange={(e) => update("customerType", e.target.value)}
            >
              {CUSTOMER_TYPES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Inquiry Source">
            <select
              className="select"
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Assigned Sales Rep">
            <input
              className="input"
              value={form.assignedTo}
              onChange={(e) => update("assignedTo", e.target.value)}
              placeholder="e.g. Priya"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Product Interest">
        <Grid>
          <Field label="Product *">
            <select
              className="select"
              value={form.product}
              onChange={(e) => update("product", e.target.value)}
            >
              {PRODUCTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Product Notes / Spec">
            <input
              className="input"
              value={form.productNotes}
              onChange={(e) => update("productNotes", e.target.value)}
              placeholder="e.g. 1500ppm azadirachtin"
            />
          </Field>
          <Field label="Quantity">
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)}
              placeholder="e.g. 1000"
            />
          </Field>
          <Field label="Unit">
            <select
              className="select"
              value={form.quantityUnit}
              onChange={(e) => update("quantityUnit", e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Packaging">
            <select
              className="select"
              value={form.packaging}
              onChange={(e) => update("packaging", e.target.value)}
            >
              <option value="">—</option>
              {PACKAGING.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Pipeline & Deal">
        <Grid>
          <Field label="Stage">
            <select
              className="select"
              value={form.stage}
              onChange={(e) => update("stage", e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estimated Value">
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={form.estimatedValue}
              onChange={(e) => update("estimatedValue", e.target.value)}
            />
          </Field>
          <Field label="Currency">
            <input
              className="input"
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
            />
          </Field>
          <Field label="Expected Close Date">
            <input
              className="input"
              type="date"
              value={form.expectedCloseAt}
              onChange={(e) => update("expectedCloseAt", e.target.value)}
            />
          </Field>
          <Field label="Next Action Date">
            <input
              className="input"
              type="date"
              value={form.nextActionAt}
              onChange={(e) => update("nextActionAt", e.target.value)}
            />
          </Field>
          <Field label="Next Action Note">
            <input
              className="input"
              value={form.nextActionNote}
              onChange={(e) => update("nextActionNote", e.target.value)}
              placeholder="e.g. Send COA for batch 2025-04"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Notes">
        <Field label="General Notes">
          <textarea
            className="textarea min-h-[80px]"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Call summary, requirements, anything useful for follow-up"
          />
        </Field>
        <Field label="Regulatory / Compliance Notes">
          <textarea
            className="textarea min-h-[60px]"
            value={form.regulatoryNotes}
            onChange={(e) => update("regulatoryNotes", e.target.value)}
            placeholder="e.g. requires EU REACH compliance; CIB&RC label needed"
          />
        </Field>
      </Section>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save Inquiry"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-soft">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700/80">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
