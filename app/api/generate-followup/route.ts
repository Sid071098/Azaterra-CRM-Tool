import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FOLLOW_UP_SYSTEM_PROMPT } from "@/lib/followupPrompt";
import { getMutationSession } from "@/lib/rbac";
import { emailTemplateFor } from "@/lib/emailTemplates";
import { readOrderDetails } from "@/lib/orderDetails";
import { readOrderStatusDetails } from "@/lib/orderStatusDetails";

type FollowUpDraft = {
  subject: string;
  body: string;
};

const TERMINAL_STAGES = new Set(["Lost"]);
const AZATERRA_WEBSITE = "https://azaterra.com/";
const AZATERRA_CONTACT = "https://azaterra.com/#contact";

export async function POST(req: NextRequest) {
  const session = getMutationSession();
  if (!session) {
    return NextResponse.json(
      { error: "Only Sales Reps and Owners can generate follow-up emails." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId : null;
  let companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  let customerRequirements =
    typeof body.customerRequirements === "string" ? body.customerRequirements.trim() : "";
  let stage = typeof body.stage === "string" ? body.stage : undefined;
  let stageTemplate: FollowUpDraft | null = null;

  if (inquiryId) {
    const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
    if (!inquiry) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });

    companyName = inquiry.companyName;
    stage = inquiry.stage;
    customerRequirements = [
      `Product: ${inquiry.product}`,
      inquiry.productNotes ? `Product notes: ${inquiry.productNotes}` : null,
      inquiry.quantity ? `Quantity: ${inquiry.quantity} ${inquiry.quantityUnit ?? ""}` : null,
      inquiry.packaging ? `Packaging: ${inquiry.packaging}` : null,
      inquiry.nextActionNote ? `Next action: ${inquiry.nextActionNote}` : null,
      inquiry.notes ? `Sales notes: ${inquiry.notes}` : null,
      inquiry.regulatoryNotes ? `Regulatory notes: ${inquiry.regulatoryNotes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const order = readOrderDetails(inquiry.notes);
    const orderStatus = readOrderStatusDetails(inquiry.notes);
    stageTemplate = emailTemplateFor(inquiry.stage, {
      contactName: inquiry.contactName || "there",
      companyName: inquiry.companyName,
      product: inquiry.product,
      productNotes: inquiry.productNotes,
      quantity: inquiry.quantity,
      quantityUnit: inquiry.quantityUnit,
      packaging: inquiry.packaging,
      country: inquiry.country,
      assignedTo: inquiry.assignedTo,
      sampleDecision: inquiry.sampleDecision,
      paymentStatus: inquiry.paymentStatus,
      paymentDueAt: inquiry.paymentDueAt,
      orderStatus: orderStatus.status,
      invoiceName: orderStatus.invoiceName,
      orderDetails:
        order.amount || order.product
          ? `${order.amount ? `amount ${order.amount}` : "order"}${order.product ? ` for ${order.product}` : ""}`
          : null,
    });
  }

  if (!companyName || !customerRequirements) {
    return NextResponse.json(
      { error: "companyName and customerRequirements are required." },
      { status: 400 },
    );
  }

  if (stage && TERMINAL_STAGES.has(stage)) {
    return NextResponse.json(
      { error: "AI follow-up is not available for closed (Won/Lost) inquiries." },
      { status: 400 },
    );
  }

  if (stageTemplate) return NextResponse.json(stageTemplate);

  const companyContext = await researchCompanyContext(companyName);
  const draft = await generateFollowUpEmail({
    companyName,
    customerRequirements,
    companyContext,
  });

  return NextResponse.json(draft);
}

async function researchCompanyContext(companyName: string) {
  const searchApiUrl = process.env.COMPANY_SEARCH_API_URL;
  const searchApiKey = process.env.COMPANY_SEARCH_API_KEY;

  if (searchApiUrl && searchApiKey) {
    try {
      const url = new URL(searchApiUrl);
      url.searchParams.set("q", companyName);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${searchApiKey}` },
        next: { revalidate: 60 * 60 * 24 },
      });
      if (res.ok) {
        const data = await res.json();
        return summarizeSearchData(data);
      }
    } catch {
      // Fall through to deterministic local context when the search provider is unavailable.
    }
  }

  return [
    `${companyName} appears in the CRM as an interested commercial buyer.`,
    "No live search provider is configured, so use only the CRM requirements and avoid external claims.",
  ].join("\n");
}

async function generateFollowUpEmail({
  companyName,
  customerRequirements,
  companyContext,
}: {
  companyName: string;
  customerRequirements: string;
  companyContext: string;
}): Promise<FollowUpDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackDraft(companyName, customerRequirements);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: FOLLOW_UP_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `Company name: ${companyName}`,
              "",
              "Company research:",
              companyContext,
              "",
              "Customer requirements:",
              customerRequirements,
            ].join("\n"),
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) throw new Error("LLM request failed");
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content ?? "{}");
    return sanitizeDraft(parsed, companyName, customerRequirements);
  } catch {
    return fallbackDraft(companyName, customerRequirements);
  }
}

function summarizeSearchData(data: unknown) {
  if (typeof data === "string") return data.slice(0, 1400);
  if (!data || typeof data !== "object") return "No structured company context was returned.";

  const record = data as Record<string, unknown>;
  const snippets = [record.summary, record.description, record.snippet]
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .join("\n");

  if (snippets) return snippets.slice(0, 1400);
  return JSON.stringify(data).slice(0, 1400);
}

function sanitizeDraft(
  value: Partial<FollowUpDraft>,
  companyName: string,
  customerRequirements: string,
) {
  const subject = typeof value.subject === "string" ? value.subject.trim() : "";
  const body = typeof value.body === "string" ? appendWebsiteLink(value.body) : "";
  if (subject && body) return { subject, body };
  return fallbackDraft(companyName, customerRequirements);
}

function fallbackDraft(companyName: string, customerRequirements: string): FollowUpDraft {
  const firstRequirement = customerRequirements.split("\n").find(Boolean) ?? "your inquiry";
  return {
    subject: `Follow-up on ${firstRequirement.replace(/^Product:\s*/i, "")}`,
    body: [
      `Hello,`,
      "",
      `Thank you for your interest in Azaterra Crop Science. I reviewed the requirements for ${companyName} and noted the following:`,
      customerRequirements,
      "",
      `Based on the available company context, we can align the discussion around practical specifications, packaging, quantity, and next-step sampling without assuming details beyond the inquiry.`,
      "",
      "I would be happy to share product specifications, brochure details, and a quote once you confirm the preferred grade, quantity, and delivery timeline.",
      "",
      "Best regards,",
      "Azaterra Crop Science",
      "",
      `Website: ${AZATERRA_WEBSITE}`,
      `Contact us: ${AZATERRA_CONTACT}`,
    ].join("\n"),
  };
}

function appendWebsiteLink(body: string) {
  const trimmed = body.trim();
  if (!trimmed) return "";
  const lines = [];
  if (!trimmed.includes(AZATERRA_WEBSITE)) lines.push(`Website: ${AZATERRA_WEBSITE}`);
  if (!trimmed.includes(AZATERRA_CONTACT)) lines.push(`Contact us: ${AZATERRA_CONTACT}`);
  if (lines.length === 0) return trimmed;
  return `${trimmed}\n\n${lines.join("\n")}`;
}
