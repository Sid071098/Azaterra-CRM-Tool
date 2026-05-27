const SAMPLE_DETAILS_LINE = /^Sample details: (.+?) x (.+)$/m;

export function readSampleDetails(notes?: string | null) {
  const match = notes?.match(SAMPLE_DETAILS_LINE);
  const quantityWithUnit = match?.[1] ?? "";
  const quantityMatch = quantityWithUnit.match(/^(.+?)\s+([A-Za-z]+)$/);

  return {
    quantity: quantityMatch?.[1] ?? quantityWithUnit,
    unit: quantityMatch?.[2] ?? "",
    product: match?.[2] ?? "",
  };
}

export function removeSampleDetails(notes?: string | null) {
  return (notes ?? "")
    .replace(SAMPLE_DETAILS_LINE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function writeSampleDetails(
  notes: string | null | undefined,
  quantity: string | number,
  unit: string,
  product: string,
) {
  const cleaned = removeSampleDetails(notes);
  const line = `Sample details: ${quantity}${unit ? ` ${unit}` : ""} x ${product}`;
  return cleaned ? `${cleaned}\n\n${line}` : line;
}
