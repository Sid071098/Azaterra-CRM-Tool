"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { saveDraft } from "@/lib/draftStorage";
import type { InquiryInsert } from "@/lib/inquiryOptions";

/**
 * Save an inquiry.
 *  - If Supabase is configured, INSERT via the supabase-js client (RLS applies).
 *  - Otherwise (demo mode), POST to the legacy /api/inquiries endpoint so
 *    submissions still show up somewhere during local development.
 *  - On network failure with allowOfflineDraft=true, stash the payload in
 *    localStorage so the rep can retry once they're back online.
 */
export async function saveInquiry(
  payload: InquiryInsert,
  opts: { allowOfflineDraft: boolean } = { allowOfflineDraft: true },
) {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable");

    try {
      const { error } = await client.from("inquiries").insert(payload);
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      if (opts.allowOfflineDraft && isLikelyNetworkError(err)) {
        saveDraft(payload);
        return;
      }
      throw err;
    }
  }

  // Demo / legacy fallback — map snake_case → camelCase for the existing route.
  try {
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toLegacyShape(payload)),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `Save failed (${res.status})`);
    }
  } catch (err) {
    if (opts.allowOfflineDraft && isLikelyNetworkError(err)) {
      saveDraft(payload);
      return;
    }
    throw err;
  }
}

function isLikelyNetworkError(err: unknown) {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("offline") ||
    msg.includes("ecconnreset") ||
    msg.includes("timeout")
  );
}

function toLegacyShape(p: InquiryInsert) {
  return {
    companyName: p.company_name,
    contactName: p.contact_name,
    email: p.email,
    phone: p.phone_whatsapp,
    country: p.country,
    city: p.city_region,
    customerType: p.customer_type,
    source: p.inquiry_source,
    product: p.product_name,
    productNotes: p.product_notes_spec,
    quantity: p.quantity,
    quantityUnit: p.unit,
    packaging: p.packaging,
    stage: mapStage(p.stage),
    sampleDecision: p.sample_decision,
    estimatedValue: p.estimated_value,
    currency: p.currency,
    expectedCloseAt: p.expected_close_date,
    nextActionAt: p.next_action_date,
    nextActionNote: p.next_action_note,
    notes: p.general_notes,
    regulatoryNotes: p.regulatory_compliance_notes,
    salesPersonId: p.assigned_sales_rep_id,
  };
}

// Legacy SQLite uses different stage labels. Best-effort mapping.
function mapStage(s: string) {
  switch (s) {
    case "Closed Won":
      return "Won";
    case "Closed Lost":
      return "Lost";
    default:
      return s;
  }
}
