"use client";

import type { RepWizardState } from "../RepInquiryWizard";
import { Leaf, Droplets, FlaskConical, MoreHorizontal } from "lucide-react";
import { PRODUCTS } from "@/lib/inquiryOptions";

const ICONS: Record<string, React.ReactNode> = {
  "Neem Oil (Cold Press)": <Leaf className="h-10 w-10" />,
  "Karanja/Pongamia Oil (Cold Press)": <Droplets className="h-10 w-10" />,
  "Custom Formulation": <FlaskConical className="h-10 w-10" />,
  Other: <MoreHorizontal className="h-10 w-10" />,
};

const SHORT_LABELS: Record<string, string> = {
  "Neem Oil (Cold Press)": "Neem Oil",
  "Karanja/Pongamia Oil (Cold Press)": "Karanja Oil",
  "Custom Formulation": "Custom",
  Other: "Other",
};

export default function StepProduct({
  state,
  patch,
}: {
  state: RepWizardState;
  patch: (p: Partial<RepWizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="mb-1 block text-base font-medium text-brand-900">
        What product does the customer want?
      </label>
      <p className="text-xs text-slate-500">Tap a card</p>

      <div className="grid grid-cols-2 gap-3">
        {PRODUCTS.map((p) => {
          const active = state.product_name === p;
          return (
            <button
              key={p}
              type="button"
              className={`flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 text-center text-sm font-semibold leading-tight ${
                active
                  ? "border-brand-600 bg-brand-50 text-brand-800 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => patch({ product_name: p })}
            >
              <span className={active ? "text-brand-700" : "text-slate-500"}>{ICONS[p]}</span>
              {SHORT_LABELS[p] ?? p}
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <label className="mb-1 block text-base font-medium text-brand-900">
          Anything special? <span className="text-sm font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          className="big-input min-h-[80px]"
          placeholder="e.g. high azadirachtin, label in Hindi"
          value={state.product_notes_spec}
          onChange={(e) => patch({ product_notes_spec: e.target.value })}
        />
      </div>
    </div>
  );
}
