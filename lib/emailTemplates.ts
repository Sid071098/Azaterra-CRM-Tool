// Stage-aware follow-up email templates for Azaterra sales reps.
// Edit the subject/body to match your voice — placeholders are replaced at runtime.

type Vars = {
  contactName: string;
  companyName: string;
  product: string;
  productNotes?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  packaging?: string | null;
  country: string;
  assignedTo?: string | null;
  sampleDecision?: string | null;
  paymentStatus?: string | null;
  paymentDueAt?: string | Date | null;
  orderDetails?: string | null;
  orderStatus?: string | null;
  invoiceName?: string | null;
};

type Template = { subject: string; body: string };

function fillQty(v: Vars) {
  if (!v.quantity) return "";
  return ` for ${v.quantity} ${v.quantityUnit ?? ""}`.trimEnd();
}

const SIGN_OFF = (rep?: string | null) =>
  `\n\nBest regards,\n${rep || "Azaterra Sales Team"}\nAzaterra Crop Science\nhttps://azaterra.com`;

export function emailTemplateFor(stage: string, v: Vars): Template {
  const qty = fillQty(v);
  const paymentDue = v.paymentDueAt ? new Date(v.paymentDueAt).toLocaleDateString("en-IN") : "";
  switch (stage) {
    case "New":
      return {
        subject: `Azaterra · ${v.product} inquiry — quick intro`,
        body:
          `Hi ${v.contactName},\n\nThank you for your interest in ${v.product}${qty}. ` +
          `I'd love to learn a bit more about your requirements at ${v.companyName} so we can recommend the right specification` +
          `${v.country ? ` and confirm logistics into ${v.country}` : ""}.\n\n` +
          `Could you share:\n` +
          `  • Target spec (e.g. azadirachtin ppm, acid value)\n` +
          `  • Annual / per-order volume\n` +
          `  • Preferred packaging${v.packaging ? ` (we noted ${v.packaging})` : ""}\n` +
          `  • Any regulatory requirements in your market\n\n` +
          `Happy to set up a quick call this week.` +
          SIGN_OFF(v.assignedTo),
      };

    case "Contacted":
      return {
        subject: `Azaterra · following up on ${v.product}`,
        body:
          `Hi ${v.contactName},\n\nFollowing up on our conversation regarding ${v.product}${qty}. ` +
          `${v.productNotes ? `For reference, you mentioned: ${v.productNotes}.\n\n` : ""}` +
          `Would it help if I sent across a technical datasheet and a sample request form? ` +
          `Let me know if you'd like to schedule a short call to walk through specs and pricing.` +
          SIGN_OFF(v.assignedTo),
      };

    case "SampleSent":
      if (v.sampleDecision === "SampleRequiredPending") {
        return {
          subject: `Azaterra · sample details for ${v.product}`,
          body:
            `Hi ${v.contactName},\n\nThank you for confirming the sample requirement for ${v.product}. ` +
            `We are preparing the sample details and will coordinate the dispatch timeline shortly.\n\n` +
            `Please share any final spec, packaging, or courier preference so we can avoid delays.` +
            SIGN_OFF(v.assignedTo),
        };
      }
      if (v.sampleDecision === "SampleNotRequired") {
        return {
          subject: `Azaterra · next steps for ${v.product}`,
          body:
            `Hi ${v.contactName},\n\nNoted that a sample is not required for ${v.product}${qty}. ` +
            `I can move ahead with the commercial discussion and share the relevant technical details for your review.\n\n` +
            `Please confirm the target quantity, packaging, and expected purchase timeline.` +
            SIGN_OFF(v.assignedTo),
        };
      }
      return {
        subject: `Azaterra · checking in on the ${v.product} sample`,
        body:
          `Hi ${v.contactName},\n\nHope the ${v.product} sample reached you in good condition. ` +
          `Would love your feedback on the trial — colour, odour, performance against your target spec` +
          `${v.productNotes ? ` (${v.productNotes})` : ""}.\n\n` +
          `If the sample looks good, I can prepare a formal quotation${qty ? ` for the${qty} requirement` : ""}` +
          `${v.packaging ? ` in ${v.packaging} packaging` : ""}.` +
          SIGN_OFF(v.assignedTo),
      };

    case "OrderReceived":
      return {
        subject: `Azaterra · order confirmation for ${v.product}`,
        body:
          `Hi ${v.contactName},\n\nThank you for placing the order for ${v.product}${qty}. ` +
          `${v.orderDetails ? `We have noted: ${v.orderDetails}.\n\n` : ""}` +
          `Please confirm the billing details, delivery address, and any required documents so we can process this smoothly.` +
          SIGN_OFF(v.assignedTo),
      };

    case "OrderStatus":
      if (v.orderStatus === "Order ready") {
        return {
          subject: `Azaterra · order ready for ${v.product}`,
          body:
            `Hi ${v.contactName},\n\nYour order for ${v.product}${qty} is ready. ` +
            `${v.invoiceName ? `I have attached the invoice (${v.invoiceName}) for your records. ` : "I am sharing the invoice for your records. "}` +
            `Please review it and confirm if we can proceed with dispatch coordination.\n\n` +
            `If any billing or delivery detail needs correction, please let me know today.` +
            SIGN_OFF(v.assignedTo),
        };
      }
      return {
        subject: `Azaterra · order update for ${v.product}`,
        body:
          `Hi ${v.contactName},\n\nYour order for ${v.product}${qty} is currently in progress. ` +
          `We will update you as soon as it is ready for dispatch.\n\n` +
          `Please let us know if there are any changes to delivery address, billing details, or required documents.` +
          SIGN_OFF(v.assignedTo),
      };

    case "OrderSent":
      return {
        subject: `Azaterra · order dispatched for ${v.product}`,
        body:
          `Hi ${v.contactName},\n\nYour order for ${v.product}${qty} has been sent. ` +
          `Please check the dispatch and invoice details, and let us know once the material is received at your end.\n\n` +
          `If you need any supporting documents or delivery coordination, I will help arrange it.` +
          SIGN_OFF(v.assignedTo),
      };

    case "Won":
      if (v.paymentStatus === "Pending" || v.paymentStatus === "NotReceived" || !v.paymentStatus) {
        return {
          subject: `Azaterra · payment follow-up for ${v.product}`,
          body:
            `Hi ${v.contactName},\n\nThank you for confirming the order for ${v.product}${qty}. ` +
            `We are ready to proceed with the next step, and this is a gentle reminder to complete the pending payment` +
            `${paymentDue ? ` by ${paymentDue}` : ""}.\n\n` +
            `Once payment is received, we will move ahead with dispatch coordination and share the relevant documents.` +
            SIGN_OFF(v.assignedTo),
        };
      }
      return {
        subject: `Azaterra · welcome aboard, ${v.companyName}!`,
        body:
          `Hi ${v.contactName},\n\nThank you for choosing Azaterra for ${v.product}${qty}. ` +
          `I'll share dispatch schedule, batch COA, and shipping documents as soon as production confirms.\n\n` +
          `Please consider me your direct point of contact for anything you need going forward.` +
          SIGN_OFF(v.assignedTo),
      };

    case "Lost":
      return {
        subject: `Azaterra · keeping the door open`,
        body:
          `Hi ${v.contactName},\n\nThank you for considering Azaterra for ${v.product}. ` +
          `Even though this round didn't work out, we'd love to stay in touch — requirements and specifications often change, ` +
          `and we'd be glad to revisit when you have a future need.` +
          SIGN_OFF(v.assignedTo),
      };

    default:
      return {
        subject: `Azaterra · following up`,
        body: `Hi ${v.contactName},\n\nJust checking in regarding ${v.product}${qty}.` + SIGN_OFF(v.assignedTo),
      };
  }
}
