const ORDER_STATUS_DETAILS_LINE =
  /^Order status details: (.+?)(?:\. Invoice: (.*?))?(?:\. Notes: (.*?))?$/m;

export function readOrderStatusDetails(notes?: string | null) {
  const match = notes?.match(ORDER_STATUS_DETAILS_LINE);
  return {
    status: match?.[1] ?? "",
    invoiceName: match?.[2] ?? "",
    notes: match?.[3] ?? "",
  };
}

export function removeOrderStatusDetails(notes?: string | null) {
  return (notes ?? "")
    .replace(ORDER_STATUS_DETAILS_LINE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function writeOrderStatusDetails(
  notes: string | null | undefined,
  details: { status: string; invoiceName?: string; notes?: string },
) {
  const cleaned = removeOrderStatusDetails(notes);
  const invoice = details.invoiceName ? `. Invoice: ${details.invoiceName}` : "";
  const statusNotes = details.notes ? `. Notes: ${details.notes}` : "";
  const line = `Order status details: ${details.status}${invoice}${statusNotes}`;
  return cleaned ? `${cleaned}\n\n${line}` : line;
}
