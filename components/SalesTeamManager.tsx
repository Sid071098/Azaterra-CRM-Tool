"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Power, Trash2 } from "lucide-react";

export type SalesPersonRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Inactive";
  isPrimary: boolean;
  inquiryCount: number;
};

export default function SalesTeamManager({ initialPeople }: { initialPeople: SalesPersonRow[] }) {
  const router = useRouter();
  const [people, setPeople] = useState<SalesPersonRow[]>(initialPeople);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", status: "Active" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/sales-persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add");
      setPeople((prev) =>
        [...prev, { ...data, inquiryCount: 0 } as SalesPersonRow].sort(sortPeople),
      );
      setForm({ firstName: "", lastName: "", email: "", status: "Active" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(id: string, next: "Active" | "Inactive") {
    setBusyId(id);
    await fetch(`/api/sales-persons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: next } : p)).sort(sortPeople),
    );
    setBusyId(null);
    router.refresh();
  }

  async function remove(id: string) {
    const person = people.find((p) => p.id === id);
    if (!person) return;
    if (
      !confirm(
        person.inquiryCount > 0
          ? `${person.firstName} owns ${person.inquiryCount} inquiry(ies). Removing them will unassign those leads. Continue?`
          : `Remove ${person.firstName} ${person.lastName}?`,
      )
    )
      return;
    setBusyId(id);
    await fetch(`/api/sales-persons/${id}`, { method: "DELETE" });
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <aside className="lg:col-span-1">
        <div className="card-soft">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-brand-900">
            <UserPlus className="h-4 w-4" /> Add a sales rep
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            They&apos;ll appear in the Sales Rep sign-in list immediately.
          </p>
          <form onSubmit={add} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">First name</label>
                <input
                  className="input"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Last name</label>
                <input
                  className="input"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@azaterra.com"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="select"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            {error ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
            <button className="btn-primary w-full" disabled={adding}>
              {adding ? "Adding…" : "Add sales rep"}
            </button>
          </form>
        </div>
      </aside>

      <section className="lg:col-span-2">
        <div className="card-soft p-0 overflow-hidden">
          <div className="border-b border-slate-200/70 px-5 py-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-brand-900">Sales team</h2>
            <span className="text-xs text-slate-500">
              {people.filter((p) => p.status === "Active").length} active ·{" "}
              {people.length} total
            </span>
          </div>
          {people.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No sales reps yet. Add your first one on the left.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200/70">
              {people.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${p.firstName} ${p.lastName}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-brand-900">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="flex items-center gap-1 truncate text-xs text-slate-500">
                          <Mail className="h-3 w-3" /> {p.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="hidden whitespace-nowrap sm:inline">
                      {p.inquiryCount} inquiries
                    </span>
                    <StatusPill status={p.status} />
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs"
                      onClick={() =>
                        toggle(p.id, p.status === "Active" ? "Inactive" : "Active")
                      }
                      disabled={busyId === p.id}
                      title={p.status === "Active" ? "Deactivate" : "Reactivate"}
                    >
                      <Power className="mr-1 h-3 w-3" />
                      {p.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      onClick={() => remove(p.id)}
                      disabled={busyId === p.id}
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function sortPeople(a: SalesPersonRow, b: SalesPersonRow) {
  if (a.status !== b.status) return a.status === "Active" ? -1 : 1;
  return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
}

function StatusPill({ status }: { status: "Active" | "Inactive" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        status === "Active"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
      {initials || "?"}
    </span>
  );
}
