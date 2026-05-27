"use client";

import type { RepWizardState } from "../RepInquiryWizard";
import type { TeamLite } from "../NewInquiryRouter";

export default function StepNotes({
  state,
  patch,
  team = [],
  isOwner = false,
}: {
  state: RepWizardState;
  patch: (p: Partial<RepWizardState>) => void;
  team?: TeamLite[];
  isOwner?: boolean;
}) {
  return (
    <div className="space-y-4">
      <label className="mb-1 block text-base font-medium text-brand-900">
        Anything else? <span className="text-sm font-normal text-slate-500">(optional)</span>
      </label>
      <p className="text-xs text-slate-500">
        Add anything useful — call summary, payment terms, what they asked for.
      </p>
      <textarea
        className="big-input min-h-[160px]"
        placeholder="Write a quick note…"
        value={state.general_notes}
        onChange={(e) => patch({ general_notes: e.target.value })}
      />

      <Summary state={state} team={team} isOwner={isOwner} />
    </div>
  );
}

function Summary({
  state,
  team,
  isOwner,
}: {
  state: RepWizardState;
  team: TeamLite[];
  isOwner: boolean;
}) {
  const customerType =
    state.customer_type === "Other" && state.customer_type_other.trim()
      ? `Other — ${state.customer_type_other.trim()}`
      : state.customer_type;
  const assignedRep = isOwner
    ? team.find((m) => m.id === state.assigned_sales_rep_id)
    : null;
  const rows: [string, string][] = [
    ["Customer", state.contact_name || "—"],
    ["Type", customerType],
    ["Company / farm", state.company_name || "—"],
    ["Phone", state.phone_whatsapp || "—"],
    ["Address", state.address || "—"],
    ["Product", state.product_name],
    ["Quantity", state.quantity ? `${state.quantity} ${state.unit}` : "—"],
    ["Follow-up", state.next_action_date || "—"],
  ];
  if (isOwner) {
    rows.push([
      "Sales rep",
      assignedRep ? `${assignedRep.firstName} ${assignedRep.lastName}` : "Unassigned",
    ]);
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
        Review before submit
      </h3>
      <dl className="grid grid-cols-3 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="col-span-1 text-xs text-slate-500">{k}</dt>
            <dd className="col-span-2 truncate text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
