"use client";

import type { RepWizardState } from "../RepInquiryWizard";
import { Minus, Plus } from "lucide-react";
import { UNITS } from "@/lib/inquiryOptions";

const QUICK_ADDS = [1, 5, 10, 50, 100];

export default function StepQuantity({
  state,
  patch,
}: {
  state: RepWizardState;
  patch: (p: Partial<RepWizardState>) => void;
}) {
  function setQty(n: number) {
    patch({ quantity: Math.max(0, Math.round(n)) });
  }

  return (
    <div className="space-y-4">
      <label className="mb-1 block text-base font-medium text-brand-900">
        How much do they need?
      </label>
      <p className="text-xs text-slate-500">Tap + or − to change</p>

      <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3">
        <button
          type="button"
          className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-700 disabled:opacity-40 active:bg-slate-200"
          onClick={() => setQty(state.quantity - 1)}
          disabled={state.quantity <= 0}
          aria-label="Decrease"
        >
          <Minus className="h-7 w-7" />
        </button>
        <div className="text-center">
          <div className="text-5xl font-bold tabular-nums text-brand-900">{state.quantity}</div>
          <div className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">
            {state.unit}
          </div>
        </div>
        <button
          type="button"
          className="grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white active:bg-brand-700"
          onClick={() => setQty(state.quantity + 1)}
          aria-label="Increase"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Or type the quantity
        </p>
        <input
          className="big-input text-center text-2xl font-semibold tabular-nums"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          value={state.quantity ? String(state.quantity) : ""}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            setQty(Number.isFinite(n) ? n : 0);
          }}
        />
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Quick add
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ADDS.map((n) => (
            <button
              key={n}
              type="button"
              className="h-12 min-w-[64px] rounded-lg border border-brand-200 bg-brand-50 px-3 text-base font-semibold text-brand-700 active:bg-brand-100"
              onClick={() => setQty(state.quantity + n)}
            >
              +{n}
            </button>
          ))}
          <button
            type="button"
            className="h-12 min-w-[64px] rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold text-slate-700 active:bg-slate-100"
            onClick={() => setQty(0)}
          >
            Reset
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Unit</p>
        <div className="grid grid-cols-4 gap-2">
          {UNITS.map((u) => {
            const active = state.unit === u;
            return (
              <button
                key={u}
                type="button"
                className={`h-12 rounded-lg border-2 text-base font-semibold ${
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                onClick={() => patch({ unit: u })}
              >
                {u}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
