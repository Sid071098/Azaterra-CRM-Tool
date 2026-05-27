"use client";

import Link from "next/link";
import { MailPlus, MessageCircle } from "lucide-react";
import { readOrderStatusDetails } from "@/lib/orderStatusDetails";

type FollowUpInquiry = {
  id: string;
  companyName: string;
  contactName: string;
  email?: string | null;
  phone?: string | null;
  product: string;
  productNotes?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  packaging?: string | null;
  stage: string;
  paymentStatus?: string | null;
  notes?: string | null;
};

const TERMINAL_STAGES = new Set(["lost"]);
const BROCHURE_URL =
  process.env.NEXT_PUBLIC_BROCHURE_URL ?? "https://azaterra.com/";
const DEFAULT_COUNTRY_CODE = "91"; // India

export default function FollowUpActions({
  inquiry,
  compact = false,
}: {
  inquiry: FollowUpInquiry;
  compact?: boolean;
}) {
  const normalizedStage = inquiry.stage.trim().toLowerCase();
  if (TERMINAL_STAGES.has(normalizedStage)) return null;
  if (normalizedStage === "won" && inquiry.paymentStatus === "Received") return null;
  const orderStatus = readOrderStatusDetails(inquiry.notes);

  function openWhatsApp() {
    const phone = normalizePhone(inquiry.phone);
    if (!phone) {
      alert("Add a phone number to this inquiry before sending a WhatsApp brochure.");
      return;
    }

    const message =
      inquiry.stage === "OrderStatus" && orderStatus.status === "Order ready"
        ? [
            `Hello ${inquiry.contactName},`,
            "",
            `Your order for ${inquiry.product} is ready.`,
            orderStatus.invoiceName
              ? `Invoice: ${orderStatus.invoiceName}. I will attach/share the invoice with this update.`
              : "Invoice details can be shared if needed.",
            "",
            "Please review and confirm dispatch details.",
          ].join("\n")
        : [
            `Hello ${inquiry.contactName},`,
            "",
            `Thank you for your interest in ${inquiry.product} from Azaterra Crop Science.`,
            "I am sharing our website with product details, applications, and company information for your review.",
            "",
            `Website: ${BROCHURE_URL}`,
            "",
            "Please let me know if you would like specifications, pricing, or a sample next.",
          ].join("\n");

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  const buttonClass = compact
    ? "inline-flex h-8 items-center justify-center gap-1 rounded-md border px-2.5 text-xs font-semibold transition"
    : "inline-flex items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm font-medium transition";

  return (
    <div className={compact ? "flex items-center gap-1.5 whitespace-nowrap" : "grid gap-2 sm:grid-cols-2"}>
      <Link
        className={`${buttonClass} border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100`}
        href={`/inquiries/${inquiry.id}/email`}
      >
        <MailPlus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        Email
      </Link>
      <button
        type="button"
        className={`${buttonClass} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
        onClick={openWhatsApp}
      >
        <MessageCircle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        WhatsApp
      </button>
    </div>
  );
}

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  // Numbers entered with a country code (+91, 0091, etc.) are kept verbatim.
  // Bare 10-digit Indian mobile numbers are prefixed with the default code.
  if (hasPlus) return digits;
  if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  return digits;
}
