const ORDER_SENT_DETAILS_LINE =
  /^Order sent details: (.+?) via (.+?) on (.+?)(?:\. Tracking: (.*?))?(?:\. Invoice: (.*?))?$/m;

export function readOrderSentDetails(notes?: string | null) {
  const match = notes?.match(ORDER_SENT_DETAILS_LINE);
  return {
    dispatchDate: match?.[1] ?? "",
    dispatchMethod: match?.[2] ?? "",
    sentBy: match?.[3] ?? "",
    trackingDetails: match?.[4] ?? "",
    invoiceName: match?.[5] ?? "",
  };
}

export function removeOrderSentDetails(notes?: string | null) {
  return (notes ?? "")
    .replace(ORDER_SENT_DETAILS_LINE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function writeOrderSentDetails(
  notes: string | null | undefined,
  details: {
    dispatchDate: string;
    dispatchMethod: string;
    sentBy: string;
    trackingDetails?: string;
    invoiceName?: string;
  },
) {
  const cleaned = removeOrderSentDetails(notes);
  const tracking = details.trackingDetails ? `. Tracking: ${details.trackingDetails}` : "";
  const invoice = details.invoiceName ? `. Invoice: ${details.invoiceName}` : "";
  const line = `Order sent details: ${details.dispatchDate} via ${details.dispatchMethod} on ${details.sentBy}${tracking}${invoice}`;
  return cleaned ? `${cleaned}\n\n${line}` : line;
}
