"use client";

import type { RepWizardState } from "../RepInquiryWizard";
import { isEmailValid, isPhoneValid } from "../RepInquiryWizard";
import type { TeamLite } from "../NewInquiryRouter";
import { Tractor, Store, Truck, MoreHorizontal, ShieldCheck } from "lucide-react";

const CUSTOMER_OPTIONS: {
  value: RepWizardState["customer_type"];
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "Farmer", label: "Farmer", icon: <Tractor className="h-7 w-7" /> },
  { value: "Retailer", label: "Retailer / Shop", icon: <Store className="h-7 w-7" /> },
  { value: "Distributor", label: "Distributor", icon: <Truck className="h-7 w-7" /> },
  { value: "Other", label: "Other", icon: <MoreHorizontal className="h-7 w-7" /> },
];

export default function StepContact({
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
  const phoneTouched = state.phone_whatsapp.trim().length > 0;
  const phoneOk = isPhoneValid(state.phone_whatsapp);
  const phoneError = phoneTouched && !phoneOk;
  const emailTouched = state.email.trim().length > 0;
  const emailOk = isEmailValid(state.email);
  const emailError = emailTouched && !emailOk;
  const labels = getCustomerLabels(state.customer_type);

  function onPhoneChange(v: string) {
    // Allow only digits up to 10
    const digits = v.replace(/\D/g, "").slice(0, 10);
    patch({ phone_whatsapp: digits });
  }

  return (
    <div className="space-y-4">
      {isOwner ? (
        <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Owner — assign sales rep
          </div>
          <select
            className="big-input"
            value={state.assigned_sales_rep_id}
            onChange={(e) => patch({ assigned_sales_rep_id: e.target.value })}
          >
            <option value="">Leave unassigned</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-brand-700/80">
            The chosen rep will own this lead and see it in their pipeline.
          </p>
        </div>
      ) : null}

      <BigLabel>Who is the customer?</BigLabel>
      <p className="text-xs text-slate-500">Pick the type</p>
      <div className="grid grid-cols-2 gap-2">
        {CUSTOMER_OPTIONS.map((opt) => {
          const active = state.customer_type === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={`flex h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 text-sm font-medium ${
                active
                  ? "border-brand-600 bg-brand-50 text-brand-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => patch({ customer_type: opt.value })}
            >
              <span className={active ? "text-brand-700" : "text-slate-500"}>{opt.icon}</span>
              {opt.label}
            </button>
          );
        })}
      </div>

      {state.customer_type === "Other" ? (
        <div>
          <BigLabel>Who made the inquiry?</BigLabel>
          <input
            className="big-input"
            placeholder="e.g. Agronomist, NGO, Cooperative…"
            value={state.customer_type_other}
            onChange={(e) => patch({ customer_type_other: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">
            Describe the customer type since it isn&apos;t one of the presets.
          </p>
        </div>
      ) : null}

      <div className="pt-2">
        <BigLabel>{labels.contact}</BigLabel>
        <input
          className="big-input"
          autoFocus
          placeholder={labels.contactPlaceholder}
          value={state.contact_name}
          onChange={(e) => patch({ contact_name: e.target.value })}
        />
      </div>

      <div>
        <BigLabel>{labels.company}</BigLabel>
        <input
          className="big-input"
          placeholder={labels.companyPlaceholder}
          value={state.company_name}
          onChange={(e) => patch({ company_name: e.target.value })}
        />
      </div>

      <div>
        <BigLabel>Customer email</BigLabel>
        <input
          className={`big-input ${
            emailError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""
          }`}
          type="email"
          placeholder="name@example.com"
          value={state.email}
          onChange={(e) => patch({ email: e.target.value })}
        />
        {emailError ? (
          <p className="mt-1 text-xs text-rose-600">Enter a valid email address.</p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">Used when sending follow-up emails.</p>
        )}
      </div>

      <div>
        <BigLabel>Phone / WhatsApp</BigLabel>
        <input
          className={`big-input ${
            phoneError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""
          }`}
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit mobile number"
          value={state.phone_whatsapp}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
        {phoneError ? (
          <p className="mt-1 text-xs text-rose-600">
            Phone number must be exactly 10 digits.
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            10-digit mobile number. Country code is added automatically.
          </p>
        )}
      </div>

      <div>
        <BigLabel>Address</BigLabel>
        <textarea
          className="big-input"
          rows={3}
          placeholder="House / shop, street, town, district, state"
          value={state.address}
          onChange={(e) => patch({ address: e.target.value })}
        />
      </div>

      <p className="pt-1 text-center text-[11px] text-slate-400">
        Country is set to <span className="font-medium">India</span> automatically.
      </p>
    </div>
  );
}

function BigLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-base font-medium text-brand-900">{children}</label>;
}

function getCustomerLabels(customerType: RepWizardState["customer_type"]) {
  switch (customerType) {
    case "Farmer":
      return {
        contact: "Name of farmer",
        contactPlaceholder: "e.g. Rajiv Mehta",
        company: "Name of farm",
        companyPlaceholder: "e.g. Green Fields Farm",
      };
    case "Retailer":
      return {
        contact: "Name of retailer",
        contactPlaceholder: "e.g. Priya Sharma",
        company: "Name of shop",
        companyPlaceholder: "e.g. Sharma Agro Center",
      };
    case "Distributor":
      return {
        contact: "Name of distributor",
        contactPlaceholder: "e.g. Arjun Patel",
        company: "Name of company",
        companyPlaceholder: "e.g. Patel Agri Distribution",
      };
    default:
      return {
        contact: "Customer name",
        contactPlaceholder: "e.g. Rajiv Mehta",
        company: "Company / organization name",
        companyPlaceholder: "e.g. Green Fields Agro",
      };
  }
}
