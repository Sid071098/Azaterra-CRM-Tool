"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserCircle2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { OwnerProfile } from "@/lib/owners";

type TeamMember = { id: string; firstName: string; lastName: string; email: string };

export default function LoginForm({
  next,
  team,
  owners,
  ownersWithPin,
}: {
  next?: string;
  team: TeamMember[];
  owners: OwnerProfile[];
  ownersWithPin: string[];
}) {
  const router = useRouter();
  const [stage, setStage] = useState<
    "pick-role" | "pick-rep" | "pick-owner" | "owner-pin"
  >("pick-role");
  const [salesPersonId, setSalesPersonId] = useState<string>("");
  const [selectedOwner, setSelectedOwner] = useState<OwnerProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInRep() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "SalesRep", salesPersonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sign-in failed");
      router.replace(next || "/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setSubmitting(false);
    }
  }

  async function signInOwner(pin: string, confirmPin?: string) {
    if (!selectedOwner) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "Owner",
          ownerId: selectedOwner.id,
          name: selectedOwner.name,
          pin,
          confirmPin: confirmPin ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sign-in failed");
      router.replace(next || "/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto grid min-h-screen max-w-6xl items-stretch md:grid-cols-2">
        <HeroPanel />
        <FormPanel>
          {stage === "pick-rep" ? (
            <PickRepPanel
              team={team}
              salesPersonId={salesPersonId}
              setSalesPersonId={setSalesPersonId}
              submitting={submitting}
              error={error}
              onBack={() => {
                setError(null);
                setStage("pick-role");
              }}
              onSubmit={signInRep}
            />
          ) : stage === "pick-owner" ? (
            <PickOwnerPanel
              owners={owners}
              selectedOwner={selectedOwner}
              setSelectedOwner={setSelectedOwner}
              submitting={submitting}
              error={error}
              onBack={() => {
                setError(null);
                setStage("pick-role");
              }}
              onSubmit={() => {
                if (!selectedOwner) return;
                setError(null);
                setStage("owner-pin");
              }}
            />
          ) : stage === "owner-pin" && selectedOwner ? (
            <OwnerPinPanel
              owner={selectedOwner}
              isNew={!ownersWithPin.includes(selectedOwner.id)}
              submitting={submitting}
              error={error}
              onBack={() => {
                setError(null);
                setStage("pick-owner");
              }}
              onSubmit={(pin, confirmPin) => signInOwner(pin, confirmPin)}
            />
          ) : (
            <PickRolePanel
              submitting={submitting}
              error={error}
              onSalesRep={() => setStage("pick-rep")}
              onOwner={() => setStage("pick-owner")}
            />
          )}
        </FormPanel>
      </div>
    </div>
  );
}

function HeroPanel() {
  return (
    <section className="relative hidden flex-col justify-between bg-brand-900 p-12 text-white md:flex">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #1a3a1f 0%, #2d6a35 55%, #527C39 100%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <img
            src="/azaterra-logo.png"
            alt="Azaterra Crop Science"
            className="h-14 w-14 rounded-md bg-white/95 p-1.5 shadow-sm"
          />
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70">
            Azaterra
            <br />
            Crop Science
          </div>
        </div>
        <h1 className="fade-up mt-8 font-display text-4xl font-semibold leading-tight text-white">
          Advancing Sustainable
          <br />
          Crop Science.
        </h1>
        <p
          className="fade-up mt-4 max-w-md text-sm leading-relaxed text-white/80"
          style={{ animationDelay: "80ms" }}
        >
          A measured CRM for our cold-pressed neem &amp; karanja programme. Capture every
          buyer inquiry, route it through the pipeline, and review performance across 35+
          markets.
        </p>
      </div>

      <ul
        className="fade-up relative grid gap-3 text-sm text-white/85 stagger"
        style={{ animationDelay: "160ms" }}
      >
        <Pillar>Two pathways — Owner reviews, Sales Reps capture.</Pillar>
        <Pillar>Every inquiry attributed to the rep who logged it.</Pillar>
        <Pillar>Built for desk and field. Works offline.</Pillar>
      </ul>

      <div className="relative text-[11px] uppercase tracking-[0.28em] text-white/50">
        Neem · Karanja · 35+ Markets
      </div>
    </section>
  );
}

function Pillar({ children }: { children: React.ReactNode }) {
  return (
    <li className="fade-up flex items-start gap-3">
      <span className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
        <Check className="h-3 w-3" />
      </span>
      <span>{children}</span>
    </li>
  );
}

function FormPanel({ children }: { children: React.ReactNode }) {
  return (
    <section className="fade-up flex items-center bg-white p-8 md:p-12">
      <div className="w-full max-w-md">
        <div className="md:hidden mb-8 flex items-center gap-3">
          <img
            src="/azaterra-logo.png"
            alt="Azaterra Crop Science"
            className="h-10 w-10 rounded-md ring-1 ring-brand-200"
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-700">
            Azaterra CRM
          </span>
        </div>
        {children}
      </div>
    </section>
  );
}

function PickRolePanel({
  submitting,
  error,
  onSalesRep,
  onOwner,
}: {
  submitting: boolean;
  error: string | null;
  onSalesRep: () => void;
  onOwner: () => void;
}) {
  return (
    <>
      <h2 className="font-display text-3xl font-semibold text-brand-900">Sign in</h2>
      <p className="mt-2 text-sm text-muted">
        Select your access type to continue to the workspace.
      </p>

      <div className="mt-8 grid gap-3 stagger">
        <RoleRow
          icon={<UserCircle2 className="h-5 w-5" />}
          title="Sales Representative"
          tagline="Capture and progress inquiries"
          onClick={onSalesRep}
          disabled={submitting}
        />
        <RoleRow
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Owner"
          tagline="Review pipeline and manage the sales team"
          onClick={onOwner}
          disabled={submitting}
        />
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <p className="mt-10 text-xs text-muted">
        Owners sign in with a 4-digit PIN. Sales reps select their name to continue.
      </p>
    </>
  );
}

function PickRepPanel({
  team,
  salesPersonId,
  setSalesPersonId,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  team: TeamMember[];
  salesPersonId: string;
  setSalesPersonId: (id: string) => void;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-brand-700"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="font-display text-3xl font-semibold text-brand-900">
        Select representative
      </h2>
      <p className="mt-2 text-sm text-muted">
        Pick your name from the active sales team to sign in.
      </p>

      {team.length === 0 ? (
        <div className="mt-6 rounded-md border border-amber/30 bg-amber/5 p-4 text-sm text-amber">
          No active sales representatives yet. Ask the Owner to add you in
          <span className="font-medium"> Manage Sales Team</span>.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white stagger">
          {team.map((p) => {
            const active = salesPersonId === p.id;
            const fullName = `${p.firstName} ${p.lastName}`;
            return (
              <li key={p.id} className="fade-up">
                <button
                  type="button"
                  onClick={() => setSalesPersonId(p.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition focus:outline-none focus:bg-brand-50 ${
                    active ? "bg-brand-50" : "hover:bg-slate-50"
                  }`}
                >
                  <Avatar name={fullName} active={active} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-brand-900">
                      {fullName}
                    </div>
                    <div className="truncate text-xs text-muted">{p.email}</div>
                  </div>
                  {active ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <button
        type="button"
        className="btn-primary mt-8 w-full"
        disabled={!salesPersonId || submitting}
        onClick={onSubmit}
      >
        {submitting ? "Signing in…" : "Continue"}
      </button>
    </>
  );
}

function PickOwnerPanel({
  owners,
  selectedOwner,
  setSelectedOwner,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  owners: OwnerProfile[];
  selectedOwner: OwnerProfile | null;
  setSelectedOwner: (o: OwnerProfile) => void;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-brand-700"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="font-display text-3xl font-semibold text-brand-900">Select owner</h2>
      <p className="mt-2 text-sm text-muted">
        Pick your owner profile, then enter your 4-digit PIN.
      </p>

      <ul className="mt-6 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white stagger">
        {owners.map((profile) => {
          const active = selectedOwner?.id === profile.id;
          return (
            <li key={profile.id} className="fade-up">
              <button
                type="button"
                onClick={() => setSelectedOwner(profile)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition focus:outline-none focus:bg-brand-50 ${
                  active ? "bg-brand-50" : "hover:bg-slate-50"
                }`}
              >
                <Avatar name={profile.name} active={active} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-brand-900">
                    {profile.name}
                  </div>
                  <div className="truncate text-xs text-muted">Owner profile</div>
                </div>
                {active ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <button
        type="button"
        className="btn-primary mt-8 w-full"
        disabled={!selectedOwner || submitting}
        onClick={onSubmit}
      >
        Continue
      </button>
    </>
  );
}

function OwnerPinPanel({
  owner,
  isNew,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  owner: OwnerProfile;
  isNew: boolean;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (pin: string, confirmPin?: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const canSubmit = isNew
    ? /^\d{4}$/.test(pin) && /^\d{4}$/.test(confirmPin)
    : /^\d{4}$/.test(pin);

  return (
    <>
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-brand-700"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="font-display text-3xl font-semibold text-brand-900">
        {isNew ? "Create your PIN" : "Enter your PIN"}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {isNew ? (
          <>
            Welcome, <span className="font-medium text-brand-900">{owner.name}</span>. Choose a
            4-digit PIN to secure your owner profile.
          </>
        ) : (
          <>
            Welcome back, <span className="font-medium text-brand-900">{owner.name}</span>.
          </>
        )}
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit(pin, isNew ? confirmPin : undefined);
        }}
      >
        <PinField
          autoFocus
          label={isNew ? "New 4-digit PIN" : "4-digit PIN"}
          value={pin}
          onChange={setPin}
          disabled={submitting}
        />
        {isNew ? (
          <PinField
            label="Confirm PIN"
            value={confirmPin}
            onChange={setConfirmPin}
            disabled={submitting}
          />
        ) : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          className="btn-primary mt-2 w-full"
          disabled={!canSubmit || submitting}
        >
          {submitting ? "Signing in…" : isNew ? "Set PIN & sign in" : "Sign in"}
        </button>
      </form>
    </>
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

function RoleRow({
  icon,
  title,
  tagline,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="fade-up group flex items-center gap-4 rounded-md border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-brand-500 hover:shadow-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
    >
      <span className="grid h-10 w-10 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-200/60">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-display text-base font-semibold text-brand-900">
          {title}
        </span>
        <span className="block text-xs text-muted">{tagline}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </button>
  );
}

function Avatar({ name, active = false }: { name: string; active?: boolean }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={`grid h-9 w-9 place-items-center rounded-full text-xs font-semibold transition ${
        active
          ? "bg-brand-500 text-white"
          : "bg-brand-50 text-brand-700 ring-1 ring-brand-200/60"
      }`}
    >
      {initials || "?"}
    </span>
  );
}
