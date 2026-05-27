"use client";

import type { RepWizardState } from "../RepInquiryWizard";

function isoDateInDays(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const QUICK = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next Week", days: 7 },
  { label: "Next Month", days: 30 },
];

function pretty(iso: string | undefined | null) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function StepNextAction({
  state,
  patch,
}: {
  state: RepWizardState;
  patch: (p: Partial<RepWizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="mb-1 block text-base font-medium text-brand-900">
        When should we follow up?
      </label>
      <p className="text-xs text-slate-500">Tap a quick option, or pick a date</p>

      <div className="grid grid-cols-2 gap-2">
        {QUICK.map((q) => {
          const iso = isoDateInDays(q.days);
          const active = state.next_action_date === iso;
          return (
            <button
              key={q.label}
              type="button"
              className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-2 ${
                active
                  ? "border-brand-600 bg-brand-50 text-brand-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => patch({ next_action_date: iso })}
            >
              <span className="text-base font-semibold">{q.label}</span>
              <span className="text-[11px] text-slate-500">{pretty(iso)}</span>
            </button>
          );
        })}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Or pick a specific date
        </label>
        <input
          className="big-input"
          type="date"
          value={state.next_action_date}
          onChange={(e) => patch({ next_action_date: e.target.value })}
        />
        {state.next_action_date ? (
          <p className="mt-1 text-xs text-brand-700">Selected: {pretty(state.next_action_date)}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-base font-medium text-brand-900">
          What's the next step? <span className="text-sm font-normal text-slate-500">(optional)</span>
        </label>
        <input
          className="big-input"
          placeholder="e.g. Send sample, share rate"
          value={state.next_action_note}
          onChange={(e) => patch({ next_action_note: e.target.value })}
        />
      </div>

      <button
        type="button"
        className="block w-full pt-2 text-center text-xs text-slate-500 underline"
        onClick={() => patch({ next_action_date: "", next_action_note: "" })}
      >
        Skip — no follow-up planned yet
      </button>
    </div>
  );
}
