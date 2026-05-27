"use client";

import { CheckCircle2, CloudOff, Plus } from "lucide-react";

export default function SuccessScreen({
  offline,
  onDone,
  onAnother,
}: {
  offline: boolean;
  onDone: () => void;
  onAnother: () => void;
}) {
  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="success-check-wrap mb-5">
          <CheckCircle2 className="success-check h-24 w-24" strokeWidth={1.5} />
        </div>

        <h2 className="text-2xl font-semibold text-brand-900">
          {offline ? "Saved on your phone" : "Inquiry saved!"}
        </h2>

        <p className="mt-2 max-w-xs text-sm text-slate-600">
          {offline ? (
            <>
              You appear to be offline. We've stored this safely on your device and will sync it
              the next time you have signal.
            </>
          ) : (
            <>Thank you. The office can now see this inquiry.</>
          )}
        </p>

        {offline ? (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            <CloudOff className="h-3.5 w-3.5" /> Will sync automatically
          </div>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-2">
          <button
            type="button"
            className="h-14 w-full rounded-xl bg-brand-600 text-lg font-semibold text-white shadow-sm active:bg-brand-700"
            onClick={onDone}
          >
            Done
          </button>
          <button
            type="button"
            className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-base font-medium text-slate-700 active:bg-slate-100"
            onClick={onAnother}
          >
            <Plus className="h-4 w-4" /> Add another inquiry
          </button>
        </div>
      </div>
    </div>
  );
}
