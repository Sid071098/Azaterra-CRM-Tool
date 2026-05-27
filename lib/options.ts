// Azaterra-specific dropdown options. Edit these to match your sales process.

export const STAGES = [
  "New",
  "Contacted",
  "SampleSent",
  "OrderReceived",
  "OrderStatus",
  "OrderSent",
  "Won",
  "Lost",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  New: "New",
  Contacted: "Contacted",
  SampleSent: "Sample",
  OrderReceived: "Order Received",
  OrderStatus: "Order Status",
  OrderSent: "Order Sent",
  Won: "Payment",
  Lost: "Lost",
};

export const STAGE_COLORS: Record<string, string> = {
  New: "bg-slate-100 text-slate-700 border-slate-200",
  Contacted: "bg-blue-50 text-blue-700 border-blue-200",
  SampleSent: "bg-amber-50 text-amber-700 border-amber-200",
  OrderReceived: "bg-teal-50 text-teal-700 border-teal-200",
  OrderStatus: "bg-sky-50 text-sky-700 border-sky-200",
  OrderSent: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Lost: "bg-rose-50 text-rose-700 border-rose-200",
};

export const SAMPLE_DECISIONS = [
  "SampleRequiredPending",
  "SampleRequiredSent",
  "SampleNotRequired",
] as const;

export const SAMPLE_DECISION_LABELS: Record<string, string> = {
  SampleRequiredPending: "Sample required",
  SampleRequiredSent: "Sample sent",
  SampleNotRequired: "Sample not required",
};

export const PAYMENT_STATUSES = ["Pending", "Received", "NotReceived"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["Bank Transfer", "UPI", "Cheque", "Cash", "Card", "Other"] as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  Pending: "Payment Pending",
  Received: "Payment Received",
  NotReceived: "Payment Not Received",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-800 border-amber-200",
  Received: "bg-emerald-50 text-emerald-800 border-emerald-200",
  NotReceived: "bg-rose-50 text-rose-800 border-rose-200",
};

export const CUSTOMER_TYPES = [
  "Farmer",
  "Distributor",
  "Manufacturer",
  "Formulator",
  "Trader",
  "Other",
];

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
];

export const SOURCES = [
  "Website",
  "Exhibition",
  "Referral",
  "Email",
  "Phone",
  "WhatsApp",
  "LinkedIn",
  "Other",
];

export const PACKAGING = [
  "50L HDPE",
  "200L HDPE",
  "200L MS Drum",
  "1000L IBC",
  "Custom",
];

export const UNITS = ["L", "Barrels", "MT", "KG"];
