"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CloudOff, Send, ShieldCheck } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import type { InquiryInsert } from "@/lib/inquiryOptions";
import { PRODUCTS, UNITS } from "@/lib/inquiryOptions";
import { saveInquiry } from "./submit";
import SuccessScreen from "./SuccessScreen";
import type { TeamLite } from "./NewInquiryRouter";

export type RepWizardState = {
  company_name: string;
  contact_name: string;
  email: string;
  phone_whatsapp: string;
  address: string;
  country: string;
  state_id: string;
  state_name: string;
  district_id: string;
  district_name: string;
  city_town_id: string;
  city_town_name: string;
  street_address: string;
  customer_type: "Distributor" | "Retailer" | "Farmer" | "Other";
  customer_type_other: string;

  product_name: string;
  product_notes_spec: string;

  quantity: number;
  unit: "L" | "Kg" | "Bags" | "Tonnes";

  next_action_date: string;
  next_action_note: string;

  general_notes: string;
  assigned_sales_rep_id: string;
};

const initial: RepWizardState = {
  company_name: "",
  contact_name: "",
  email: "",
  phone_whatsapp: "",
  address: "",
  country: "India",
  state_id: "",
  state_name: "",
  district_id: "",
  district_name: "",
  city_town_id: "",
  city_town_name: "",
  street_address: "",
  customer_type: "Farmer",
  customer_type_other: "",

  product_name: "Neem Oil Cold Pressed",
  product_notes_spec: "",

  quantity: 0,
  unit: "L",

  next_action_date: "",
  next_action_note: "",

  general_notes: "",
  assigned_sales_rep_id: "",
};

const CUSTOMER_TYPES: RepWizardState["customer_type"][] = [
  "Farmer",
  "Retailer",
  "Distributor",
  "Other",
];

const QUICK_DATES = [
  { label: "Tomorrow", days: 1 },
  { label: "+3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "Next month", days: 30 },
];

const INDIA_LOCATION_API = "/api/locations";
const MANUAL_CITY_ID = "__manual_city__";

type IndiaState = { id: number; name: string; code?: string };
type IndiaDistrict = { id: number; name: string; state_id: number };
type IndiaTaluka = { id: number; name: string; district_id: number };

export function isPhoneValid(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 0 || digits.length === 10;
}

export function isEmailValid(raw: string): boolean {
  const value = raw.trim();
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isoInDays(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function RepInquiryWizard({
  currentUser,
  team = [],
  isOwner = false,
}: {
  currentUser: SessionUser;
  team?: TeamLite[];
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<RepWizardState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [stateOptions, setStateOptions] = useState<IndiaState[]>([]);
  const [districtOptions, setDistrictOptions] = useState<IndiaDistrict[]>([]);
  const [cityTownOptions, setCityTownOptions] = useState<IndiaTaluka[]>([]);
  const [locationLoading, setLocationLoading] = useState({
    states: false,
    districts: false,
    cityTowns: false,
  });
  const [locationError, setLocationError] = useState("");

  function patch(partial: Partial<RepWizardState>) {
    setState((s) => ({ ...s, ...partial }));
  }

  useEffect(() => {
    let cancelled = false;
    setLocationLoading((current) => ({ ...current, states: true }));
    fetch(`${INDIA_LOCATION_API}/states`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const options = Array.isArray(data?.data?.states) ? data.data.states : [];
        setStateOptions(options);
      })
      .catch(() => {
        if (!cancelled) setLocationError("Could not load the India location list. You can still enter the address details manually.");
      })
      .finally(() => {
        if (!cancelled) setLocationLoading((current) => ({ ...current, states: false }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.state_id) {
      setDistrictOptions([]);
      return;
    }
    let cancelled = false;
    setLocationLoading((current) => ({ ...current, districts: true }));
    const query = new URLSearchParams({
      state_id: state.state_id,
      state_name: state.state_name,
    });
    fetch(`${INDIA_LOCATION_API}/districts?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const options = Array.isArray(data?.data?.districts) ? data.data.districts : [];
        setDistrictOptions(options);
      })
      .catch(() => {
        if (!cancelled) setLocationError("Could not load districts for this state. Try another state or fill the street details.");
      })
      .finally(() => {
        if (!cancelled) setLocationLoading((current) => ({ ...current, districts: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [state.state_id]);

  useEffect(() => {
    if (!state.district_id) {
      setCityTownOptions([]);
      return;
    }
    let cancelled = false;
    setLocationLoading((current) => ({ ...current, cityTowns: true }));
    const query = new URLSearchParams({
      district_id: state.district_id,
      district_name: state.district_name,
      state_name: state.state_name,
    });
    fetch(`${INDIA_LOCATION_API}/talukas?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const options = Array.isArray(data?.data?.talukas) ? data.data.talukas : [];
        setCityTownOptions(options);
      })
      .catch(() => {
        if (!cancelled) setLocationError("Could not load cities/towns for this district.");
      })
      .finally(() => {
        if (!cancelled) setLocationLoading((current) => ({ ...current, cityTowns: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [state.district_id]);

  const phoneTouched = state.phone_whatsapp.trim().length > 0;
  const phoneOk = isPhoneValid(state.phone_whatsapp);
  const phoneRequiredOk = state.phone_whatsapp.trim().length === 10;
  const phoneError = phoneTouched && !phoneOk;
  const emailTouched = state.email.trim().length > 0;
  const emailOk = isEmailValid(state.email);
  const emailError = emailTouched && !emailOk;
  const otherOk =
    state.customer_type !== "Other" || state.customer_type_other.trim().length > 0;
  const namesOk =
    state.company_name.trim().length > 0 && state.contact_name.trim().length > 0;
  const addressOk =
    state.country.trim().length > 0 &&
    state.state_id.length > 0 &&
    state.district_id.length > 0 &&
    state.city_town_id.length > 0 &&
    state.city_town_name.trim().length > 0 &&
    state.street_address.trim().length > 0;
  const customerOk = namesOk && phoneRequiredOk && emailOk && otherOk && addressOk;
  const productOk = state.product_name.length > 0;
  const quantityOk = state.quantity > 0;

  const canSubmit = customerOk && productOk && quantityOk;
  const steps = [
    { label: "Customer", complete: customerOk },
    { label: "Product", complete: productOk && quantityOk },
    { label: "Follow-up", complete: true },
  ];
  const isLastStep = activeStep === steps.length - 1;

  function missingCustomerFields() {
    return [
      !state.contact_name.trim() ? "Customer name" : "",
      !state.company_name.trim() ? "Company / farm" : "",
      state.customer_type === "Other" && !state.customer_type_other.trim()
        ? "Customer description"
        : "",
      !phoneRequiredOk ? "Phone / WhatsApp" : "",
      !emailOk ? "Valid email address" : "",
      !state.country.trim() ? "Country" : "",
      !state.state_id ? "State" : "",
      !state.district_id ? "District" : "",
      !state.city_town_id ? "City / town" : "",
      !state.street_address.trim() ? "Street address" : "",
    ].filter(Boolean);
  }

  function showMissingPopup(title: string, fields: string[]) {
    alert(`${title}\n\nPlease fill:\n- ${fields.join("\n- ")}`);
  }

  function validateCustomerStep() {
    const missing = missingCustomerFields();
    if (missing.length === 0) return true;
    showMissingPopup("Customer details are required.", missing);
    return false;
  }

  function validateProductStep() {
    const missing = [
      !state.product_name ? "Product" : "",
      !quantityOk ? "Quantity" : "",
    ].filter(Boolean);
    if (missing.length === 0) return true;
    showMissingPopup("Product details are required.", missing);
    return false;
  }

  function goToStep(index: number) {
    if (index <= activeStep) {
      setActiveStep(index);
      return;
    }
    if (index > 0 && !validateCustomerStep()) return;
    if (index > 1 && !validateProductStep()) return;
    setActiveStep(index);
  }

  function goNext() {
    if (activeStep === 0 && !validateCustomerStep()) return;
    if (activeStep === 1 && !validateProductStep()) return;
    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goBack() {
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCustomerStep() || !validateProductStep()) return;
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    const payload: InquiryInsert = {
      company_name: state.company_name.trim(),
      contact_name: state.contact_name.trim(),
      email: state.email.trim() || null,
      phone_whatsapp: state.phone_whatsapp.replace(/\D/g, "") || null,
      country: state.country,
      city_region: formatAddress(state) || null,
      customer_type: state.customer_type,
      inquiry_source: null,
      assigned_sales_rep_id: isOwner
        ? state.assigned_sales_rep_id || null
        : currentUser?.id ?? null,
      product_name: state.product_name,
      product_notes_spec: state.product_notes_spec.trim() || null,
      quantity: state.quantity || null,
      unit: state.unit,
      packaging: null,
      stage: "New",
      estimated_value: null,
      currency: "INR",
      expected_close_date: null,
      next_action_date: state.next_action_date || null,
      next_action_note: state.next_action_note.trim() || null,
      general_notes:
        [
          state.general_notes.trim(),
          state.customer_type === "Other" && state.customer_type_other.trim()
            ? `Customer description: ${state.customer_type_other.trim()}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n") || null,
      regulatory_compliance_notes: null,
      created_by: currentUser?.id ?? null,
    };

    try {
      const beforeDrafts = readDraftCount();
      await saveInquiry(payload, { allowOfflineDraft: true });
      const afterDrafts = readDraftCount();
      if (afterDrafts > beforeDrafts) setSavedOffline(true);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SuccessScreen
        offline={savedOffline}
        onDone={() => router.push("/")}
        onAnother={() => {
          setDone(false);
          setSavedOffline(false);
          setState(initial);
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-5xl">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <h1 className="font-display text-lg font-semibold text-brand-900">New inquiry</h1>
        <p className="mb-4 text-xs text-muted">
          Fill in the details. Required: customer name, company, product, quantity.
        </p>

        {isOwner ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-wide">Assign sales rep:</span>
            <select
              className="h-8 rounded border border-brand-300 bg-white px-2 text-xs"
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
          </div>
        ) : null}

        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {steps.map((step, index) => (
            <button
              key={step.label}
              type="button"
              onClick={() => goToStep(index)}
              className={`rounded-md border px-3 py-2 text-left text-xs font-semibold transition ${
                activeStep === index
                  ? "border-brand-600 bg-brand-50 text-brand-900"
                  : step.complete
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] ring-1 ring-current/15">
                {index + 1}
              </span>
              {step.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
          <section className={activeStep === 0 ? "space-y-3" : "hidden"}>
            <SectionTitle>Customer</SectionTitle>

            <Field label="Customer type">
              <div className="flex flex-wrap gap-1.5">
                {CUSTOMER_TYPES.map((ct) => {
                  const active = state.customer_type === ct;
                  return (
                    <button
                      key={ct}
                      type="button"
                      className={`rounded border px-2.5 py-1 text-xs font-medium ${
                        active
                          ? "border-brand-600 bg-brand-50 text-brand-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => patch({ customer_type: ct })}
                    >
                      {ct}
                    </button>
                  );
                })}
              </div>
            </Field>

            {state.customer_type === "Other" ? (
              <Field label="Describe customer" required>
                <Input
                  placeholder="e.g. Agronomist, NGO, Cooperative"
                  value={state.customer_type_other}
                  onChange={(v) => patch({ customer_type_other: v })}
                />
              </Field>
            ) : null}

            <Field label="Customer name" required>
              <Input
                autoFocus
                placeholder="e.g. Rajiv Mehta"
                value={state.contact_name}
                onChange={(v) => patch({ contact_name: v })}
              />
            </Field>

            <Field label="Company / farm" required>
              <Input
                placeholder="e.g. Green Fields Farm"
                value={state.company_name}
                onChange={(v) => patch({ company_name: v })}
              />
            </Field>

            <Field
              label="Email"
              error={emailError ? "Enter a valid email address." : undefined}
            >
              <Input
                type="email"
                placeholder="name@example.com"
                value={state.email}
                onChange={(v) => patch({ email: v })}
                invalid={emailError}
              />
            </Field>

            <Field
              label="Phone / WhatsApp"
              required
              error={phoneError ? "Must be exactly 10 digits." : undefined}
              hint="10-digit mobile. India code added automatically."
            >
              <Input
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={state.phone_whatsapp}
                onChange={(v) => patch({ phone_whatsapp: v.replace(/\D/g, "").slice(0, 10) })}
                invalid={phoneError}
              />
            </Field>

            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                Address
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Country" required>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    value={state.country}
                    onChange={(e) => patch({ country: e.target.value })}
                  >
                    <option value="India">India</option>
                  </select>
                </Field>

                <Field label="State" required>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
                    value={state.state_id}
                    disabled={locationLoading.states}
                    onChange={(e) => {
                      const option = stateOptions.find((item) => String(item.id) === e.target.value);
                      patch({
                        state_id: e.target.value,
                        state_name: option?.name ?? "",
                        district_id: "",
                        district_name: "",
                        city_town_id: "",
                        city_town_name: "",
                      });
                    }}
                  >
                    <option value="">{locationLoading.states ? "Loading states..." : "Select state"}</option>
                    {stateOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                    {!locationLoading.states && stateOptions.length === 0 ? (
                      <option value="" disabled>No states available</option>
                    ) : null}
                  </select>
                </Field>

                <Field label="District" required>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
                    value={state.district_id}
                    disabled={!state.state_id || locationLoading.districts}
                    onChange={(e) => {
                      const option = districtOptions.find((item) => String(item.id) === e.target.value);
                      patch({
                        district_id: e.target.value,
                        district_name: option?.name ?? "",
                        city_town_id: "",
                        city_town_name: "",
                      });
                    }}
                  >
                    <option value="">
                      {locationLoading.districts ? "Loading districts..." : "Select district"}
                    </option>
                    {districtOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                    {!locationLoading.districts && state.state_id && districtOptions.length === 0 ? (
                      <option value="" disabled>No districts available</option>
                    ) : null}
                  </select>
                </Field>

                <Field label="City / town" required>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
                    value={state.city_town_id}
                    disabled={!state.district_id || locationLoading.cityTowns}
                    onChange={(e) => {
                      const option = cityTownOptions.find((item) => String(item.id) === e.target.value);
                      patch({
                        city_town_id: e.target.value,
                        city_town_name: e.target.value === MANUAL_CITY_ID ? "" : option?.name ?? "",
                      });
                    }}
                  >
                    <option value="">
                      {locationLoading.cityTowns ? "Loading cities/towns..." : "Select city/town"}
                    </option>
                    {cityTownOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                    <option value={MANUAL_CITY_ID}>Not listed / enter manually</option>
                    {!locationLoading.cityTowns && state.district_id && cityTownOptions.length === 0 ? (
                      <option value="" disabled>No city/town options available</option>
                    ) : null}
                  </select>
                  {state.city_town_id === MANUAL_CITY_ID ? (
                    <input
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      placeholder="Enter city, town, taluka, or village"
                      value={state.city_town_name}
                      onChange={(e) => patch({ city_town_name: e.target.value })}
                    />
                  ) : null}
                </Field>
              </div>

              <Field label="Street address" required>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="Street address 1, shop/farm name, landmark"
                  value={state.street_address}
                  onChange={(e) => patch({ street_address: e.target.value })}
                />
              </Field>
              {locationError ? (
                <p className="mt-2 text-xs text-amber-700">{locationError}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  District and city/town options load after selecting the previous level. Use manual entry if a place is not listed.
                </p>
              )}
            </div>
          </section>

          <section className={activeStep === 1 ? "space-y-3" : "hidden"}>
            <SectionTitle>Product &amp; quantity</SectionTitle>

            <Field label="Product" required>
              <div className="flex flex-wrap gap-1.5">
                {PRODUCTS.map((p) => {
                  const active = state.product_name === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`rounded border px-2.5 py-1 text-xs font-medium ${
                        active
                          ? "border-brand-600 bg-brand-50 text-brand-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => patch({ product_name: p })}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Product notes" hint="e.g. high azadirachtin, label in Hindi">
              <Input
                placeholder="Specifications, labelling, etc."
                value={state.product_notes_spec}
                onChange={(v) => patch({ product_notes_spec: v })}
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Quantity" required>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={state.quantity ? String(state.quantity) : ""}
                    onChange={(e) => {
                      const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                      patch({ quantity: Number.isFinite(n) ? Math.max(0, n) : 0 });
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </Field>
              </div>
              <div>
                <Field label="Unit">
                  <select
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    value={state.unit}
                    onChange={(e) =>
                      patch({ unit: e.target.value as RepWizardState["unit"] })
                    }
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

          </section>

          <section className={activeStep === 2 ? "space-y-3" : "hidden"}>
            <SectionTitle>Follow-up</SectionTitle>

            <Field label="Next follow-up date" hint="Pick a quick option or set a date">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_DATES.map((q) => {
                  const iso = isoInDays(q.days);
                  const active = state.next_action_date === iso;
                  return (
                    <button
                      key={q.label}
                      type="button"
                      className={`rounded border px-2 py-1 text-xs font-medium ${
                        active
                          ? "border-brand-600 bg-brand-50 text-brand-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => patch({ next_action_date: iso })}
                    >
                      {q.label}
                    </button>
                  );
                })}
                <input
                  type="date"
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                  value={state.next_action_date}
                  onChange={(e) => patch({ next_action_date: e.target.value })}
                />
                {state.next_action_date ? (
                  <button
                    type="button"
                    className="text-xs text-slate-500 underline"
                    onClick={() => patch({ next_action_date: "" })}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </Field>

            <Field label="Next step" hint="Optional">
              <Input
                placeholder="e.g. Send sample, share rate"
                value={state.next_action_note}
                onChange={(v) => patch({ next_action_note: v })}
              />
            </Field>

            <Field label="Notes" hint="Call summary, payment terms, etc.">
              <textarea
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                placeholder="Anything else worth recording…"
                value={state.general_notes}
                onChange={(e) => patch({ general_notes: e.target.value })}
              />
            </Field>
          </section>
          </div>

          <aside className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              Inquiry details
            </p>
            <dl className="mt-3 space-y-2 text-xs">
              <SummaryLine label="Customer" value={state.contact_name || "Not added"} />
              <SummaryLine label="Company" value={state.company_name || "Not added"} />
              <SummaryLine label="Phone" value={state.phone_whatsapp || "Optional"} />
              <SummaryLine label="Address" value={formatAddress(state) || "Optional"} />
              <SummaryLine label="Product" value={state.product_name || "Not selected"} />
              <SummaryLine
                label="Quantity"
                value={state.quantity ? `${state.quantity} ${state.unit}` : "Not added"}
              />
              <SummaryLine label="Next step" value={state.next_action_note || "Optional"} />
              <SummaryLine
                label="Sales rep"
                value={
                  isOwner
                    ? team.find((m) => m.id === state.assigned_sales_rep_id)
                      ? `${team.find((m) => m.id === state.assigned_sales_rep_id)?.firstName} ${team.find((m) => m.id === state.assigned_sales_rep_id)?.lastName}`
                      : "Unassigned"
                    : currentUser?.fullName ?? "Unassigned"
                }
              />
            </dl>
          </aside>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <p className="text-[11px] text-slate-500">
            Country: <span className="font-medium text-slate-700">India</span> · Submitting as{" "}
            <span className="font-medium text-slate-700">
              {currentUser?.fullName ?? "Unassigned"}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={activeStep === 0 || submitting}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {isLastStep ? (
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
                disabled={!canSubmit || submitting}
              >
                <Send className="h-4 w-4" /> {submitting ? "Saving…" : "Save inquiry"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {!navigatorOnline() ? (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-700">
            <CloudOff className="h-3.5 w-3.5" /> Offline — submission will save locally and sync
            later.
          </div>
        ) : null}
      </div>
    </form>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-slate-100 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
      {children}
    </h2>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-words font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
  autoFocus,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
  maxLength?: number;
  autoFocus?: boolean;
  invalid?: boolean;
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      maxLength={maxLength}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 ${
        invalid
          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
          : "border-slate-200 focus:border-brand-500 focus:ring-brand-200"
      }`}
    />
  );
}

function formatAddress(state: RepWizardState) {
  return [
    state.street_address.trim(),
    state.city_town_name,
    state.district_name,
    state.state_name,
    state.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function navigatorOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function readDraftCount() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = JSON.parse(localStorage.getItem("azaterra.inquiry.drafts.v1") || "[]");
    return Array.isArray(raw) ? raw.length : 0;
  } catch {
    return 0;
  }
}
