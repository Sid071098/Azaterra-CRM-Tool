const ORDER_DETAILS_LINE = /^Order details: (.+?) for (.+)$/m;
const ADVANCE_PAYMENT_LINE = /^Advance payment required: (Yes|No)$/m;

export function readOrderDetails(notes?: string | null) {
  const match = notes?.match(ORDER_DETAILS_LINE);
  const advanceMatch = notes?.match(ADVANCE_PAYMENT_LINE);
  return {
    amount: match?.[1] ?? "",
    product: match?.[2] ?? "",
    advancePaymentRequired: advanceMatch?.[1] === "Yes",
  };
}

export function removeOrderDetails(notes?: string | null) {
  return (notes ?? "")
    .replace(ORDER_DETAILS_LINE, "")
    .replace(ADVANCE_PAYMENT_LINE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function writeOrderDetails(
  notes: string | null | undefined,
  amount: string | number,
  product: string,
  advancePaymentRequired = false,
) {
  const cleaned = removeOrderDetails(notes);
  const line = `Order details: ${amount} for ${product}\nAdvance payment required: ${
    advancePaymentRequired ? "Yes" : "No"
  }`;
  return cleaned ? `${cleaned}\n\n${line}` : line;
}
