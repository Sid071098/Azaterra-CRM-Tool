type IndiaMartOrderInput = {
  product: string | null;
  productNotes?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  packaging?: string | null;
  estimatedValue?: number | null;
  currency?: string | null;
  notes?: string | null;
};

export function readIndiaMartOrderDetails(input: IndiaMartOrderInput) {
  const text = [input.notes, input.productNotes].filter(Boolean).join("\n");
  return {
    productName:
      readFirstLabeledValue(text, ["Product Name", "Product"]) ||
      input.productNotes ||
      input.product ||
      null,
    quantity:
      formatQuantity(input.quantity, input.quantityUnit) ||
      readFirstLabeledValue(text, ["Quantity", "Approx Quantity", "Required Quantity"]) ||
      null,
    packagingSize:
      input.packaging ||
      readFirstLabeledValue(text, ["Packaging Size", "Packaging", "Pack Size"]) ||
      null,
    productForm:
      readFirstLabeledValue(text, ["Product Form", "Form"]) ||
      null,
    concentration:
      readFirstLabeledValue(text, ["Concentration"]) ||
      null,
    grade:
      readFirstLabeledValue(text, ["Grade"]) ||
      null,
    probableOrderValue:
      readFirstLabeledValue(text, ["Probable Order Value", "Estimated Value", "Order Value"]) ||
      formatEstimatedValue(input.estimatedValue, input.currency) ||
      null,
    probableRequirementType:
      readFirstLabeledValue(text, ["Probable Requirement Type", "Requirement Type"]) ||
      null,
  };
}

function readFirstLabeledValue(text: string, labels: string[]) {
  for (const label of labels) {
    const value = readLabeledValue(text, label);
    if (value) return value;
  }
  return null;
}

function readLabeledValue(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^\\s*${escaped}\\s*(?::|-|\\u2013|\\u2014)\\s*(.+?)\\s*$`,
    "im",
  );
  const match = text.match(pattern);
  return match?.[1]?.replace(/\*/g, "").replace(/\s+/g, " ").trim() || null;
}

function formatQuantity(quantity: number | null | undefined, unit: string | null | undefined) {
  if (!quantity) return null;
  return [quantity, unit].filter(Boolean).join(" ");
}

function formatEstimatedValue(value: number | null | undefined, currency: string | null | undefined) {
  if (!value) return null;
  if (currency === "INR") return `Rs. ${value.toLocaleString("en-IN")}`;
  if (currency) return `${currency} ${value.toLocaleString("en-US")}`;
  return value.toLocaleString("en-US");
}
