// Spec-aligned options for the New Inquiry module (matches Supabase enums).
// These are deliberately separate from lib/options.ts (which serves the
// legacy Pipeline page) so the new module can adopt the new schema without
// breaking what already works.

export const CUSTOMER_TYPES = ["Distributor", "Retailer", "Farmer", "Other"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const STAGES = [
  "New",
  "Contacted",
  "SampleSent",
  "OrderReceived",
  "OrderStatus",
  "OrderSent",
  "Closed Won",
  "Closed Lost",
] as const;
export type Stage = (typeof STAGES)[number];

export const UNITS = ["L", "Kg", "Bags", "Tonnes"] as const;
export type Unit = (typeof UNITS)[number];

export const PRODUCTS = [
  "Neem Oil Cold Pressed",
  "Neem Oil EC 300 PPM",
  "Neem Oil EC 1500 PPM",
  "Neem Oil EC 3000 PPM",
  "Neem Oil EC 10000 PPM",
  "Neem Cake Powder",
  "Karanj Oil",
  "Karanj Cake",
  "Custom Formulation",
  "Other",
] as const;

export const INQUIRY_SOURCES = [
  "Website",
  "Exhibition",
  "Referral",
  "Email",
  "Phone",
  "WhatsApp",
  "LinkedIn",
  "Walk-in",
  "Other",
];

export const PACKAGING_OPTIONS = ["1L", "5L", "20L", "50L", "200L", "Bulk / IBC", "Custom"];

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];
export const SAMPLE_DECISIONS = [
  "SampleRequiredPending",
  "SampleRequiredSent",
  "SampleNotRequired",
] as const;
export type SampleDecision = (typeof SAMPLE_DECISIONS)[number];

export const SAMPLE_DECISION_LABELS: Record<SampleDecision, string> = {
  SampleRequiredPending: "Sample required",
  SampleRequiredSent: "Sample sent",
  SampleNotRequired: "Sample not required",
};

// Shape of a row destined for the `inquiries` table.
export type InquiryInsert = {
  company_name: string;
  contact_name: string;
  email: string | null;
  phone_whatsapp: string | null;
  country: string;
  city_region: string | null;
  customer_type: CustomerType | null;
  inquiry_source: string | null;
  assigned_sales_rep_id: string | null;
  product_name: string;
  product_notes_spec: string | null;
  quantity: number | null;
  unit: Unit | null;
  packaging: string | null;
  stage: Stage;
  sample_decision?: SampleDecision | null;
  estimated_value: number | null;
  currency: string;
  expected_close_date: string | null; // YYYY-MM-DD
  next_action_date: string | null;
  next_action_note: string | null;
  general_notes: string | null;
  regulatory_compliance_notes: string | null;
  created_by: string | null;
};
