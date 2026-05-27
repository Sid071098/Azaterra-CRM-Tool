const PAYMENT_DETAILS_LINE = /^Payment details: (.+?) via (.+)$/m;

export function readPaymentDetails(notes?: string | null) {
  const match = notes?.match(PAYMENT_DETAILS_LINE);
  return {
    amount: match?.[1] ?? "",
    method: match?.[2] ?? "",
  };
}

export function removePaymentDetails(notes?: string | null) {
  return (notes ?? "")
    .replace(PAYMENT_DETAILS_LINE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function writePaymentDetails(notes: string | null | undefined, amount: string | number, method: string) {
  const cleaned = removePaymentDetails(notes);
  const line = `Payment details: ${amount} via ${method}`;
  return cleaned ? `${cleaned}\n\n${line}` : line;
}
