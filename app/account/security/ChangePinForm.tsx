"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePinForm() {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ready =
    /^\d{4}$/.test(currentPin) && /^\d{4}$/.test(newPin) && /^\d{4}$/.test(confirmPin);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/owner/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not change PIN");
      setSuccess(true);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change PIN");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PinField
        label="Current PIN"
        value={currentPin}
        onChange={setCurrentPin}
        disabled={submitting}
        autoFocus
      />
      <PinField
        label="New 4-digit PIN"
        value={newPin}
        onChange={setNewPin}
        disabled={submitting}
      />
      <PinField
        label="Confirm new PIN"
        value={confirmPin}
        onChange={setConfirmPin}
        disabled={submitting}
      />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {success ? (
        <p className="text-sm text-emerald-700">PIN updated. Use it next time you sign in.</p>
      ) : null}

      <button
        type="submit"
        className="btn-primary mt-2 w-full"
        disabled={!ready || submitting}
      >
        {submitting ? "Updating…" : "Update PIN"}
      </button>
    </form>
  );
}

function PinField({
  label,
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={4}
        pattern="\d{4}"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        disabled={disabled}
        autoFocus={autoFocus}
        className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-center text-2xl tracking-[0.6em] font-semibold text-brand-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        placeholder="••••"
      />
    </label>
  );
}
