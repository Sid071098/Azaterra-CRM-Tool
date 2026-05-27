"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SAMPLE_DECISIONS,
  SAMPLE_DECISION_LABELS,
  STAGES,
  STAGE_COLORS,
  STAGE_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PRODUCTS,
  UNITS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/options";
import FollowUpActions from "@/components/FollowUpActions";
import { readPaymentDetails } from "@/lib/paymentDetails";
import { readOrderDetails } from "@/lib/orderDetails";
import { readOrderStatusDetails } from "@/lib/orderStatusDetails";
import { readOrderSentDetails } from "@/lib/orderSentDetails";
import { readSampleDetails } from "@/lib/sampleDetails";
import { ArrowLeft, CheckCircle2, Send, Trash2 } from "lucide-react";
import Link from "next/link";

type Inquiry = {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  companyName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  country: string;
  city: string | null;
  customerType: string;
  source: string;
  product: string;
  productNotes: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  packaging: string | null;
  stage: string;
  sampleDecision: string | null;
  expectedCloseAt: string | Date | null;
  estimatedValue: number | null;
  currency: string | null;
  assignedTo: string | null;
  salesPersonId: string | null;
  salesPersonName: string | null;
  nextActionAt: string | Date | null;
  nextActionNote: string | null;
  notes: string | null;
  regulatoryNotes: string | null;
  ownerFollowUpRequest: string | null;
  ownerRequestedChanges: string | null;
  ownerRequestStatus: string | null;
  ownerRequestAt: string | Date | null;
  paymentStatus: string | null;
  paymentDueAt: string | Date | null;
  paymentReceivedAt: string | Date | null;
  lastPaymentReminderAt: string | Date | null;
};

type TeamMember = { id: string; name: string };

export default function InquiryDetail({
  inquiry,
  team = [],
  isOwner = false,
  canDelete = false,
  returnHref = "/inquiries",
  returnLabel = "All inquiries",
}: {
  inquiry: Inquiry;
  team?: TeamMember[];
  isOwner?: boolean;
  canDelete?: boolean;
  returnHref?: string;
  returnLabel?: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(inquiry.stage);
  const [sampleDecision, setSampleDecision] = useState(inquiry.sampleDecision ?? "");
  const [notes, setNotes] = useState(inquiry.notes ?? "");
  const [nextActionAt, setNextActionAt] = useState(
    inquiry.nextActionAt ? new Date(inquiry.nextActionAt).toISOString().slice(0, 10) : "",
  );
  const [nextActionNote, setNextActionNote] = useState(inquiry.nextActionNote ?? "");
  const [salesPersonId, setSalesPersonId] = useState(inquiry.salesPersonId ?? "");
  const [paymentStatus, setPaymentStatus] = useState(inquiry.paymentStatus ?? "");
  const savedPaymentDetails = readPaymentDetails(inquiry.notes);
  const savedSampleDetails = readSampleDetails(inquiry.notes);
  const savedOrderDetails = readOrderDetails(inquiry.notes);
  const savedOrderStatusDetails = readOrderStatusDetails(inquiry.notes);
  const savedOrderSentDetails = readOrderSentDetails(inquiry.notes);
  const [paymentAmount, setPaymentAmount] = useState(savedPaymentDetails.amount);
  const [paymentMethod, setPaymentMethod] = useState(savedPaymentDetails.method);
  const [sampleQuantity, setSampleQuantity] = useState(savedSampleDetails.quantity);
  const [sampleQuantityType, setSampleQuantityType] = useState(
    savedSampleDetails.unit || inquiry.quantityUnit || "L",
  );
  const [sampleProduct, setSampleProduct] = useState(savedSampleDetails.product || inquiry.product);
  const [orderAmount, setOrderAmount] = useState(savedOrderDetails.amount);
  const [orderProduct, setOrderProduct] = useState(savedOrderDetails.product || inquiry.product);
  const [orderAdvancePaymentRequired, setOrderAdvancePaymentRequired] = useState(
    savedOrderDetails.advancePaymentRequired,
  );
  const [orderStatus, setOrderStatus] = useState(savedOrderStatusDetails.status || "Order in progress");
  const [orderStatusInvoiceName, setOrderStatusInvoiceName] = useState(savedOrderStatusDetails.invoiceName);
  const [orderStatusNotes, setOrderStatusNotes] = useState(savedOrderStatusDetails.notes);
  const [orderSentDispatchDate, setOrderSentDispatchDate] = useState(savedOrderSentDetails.dispatchDate);
  const [orderSentDispatchMethod, setOrderSentDispatchMethod] = useState(savedOrderSentDetails.dispatchMethod);
  const [orderSentSentBy, setOrderSentSentBy] = useState(savedOrderSentDetails.sentBy);
  const [orderSentTrackingDetails, setOrderSentTrackingDetails] = useState(savedOrderSentDetails.trackingDetails);
  const [paymentDueAt, setPaymentDueAt] = useState(
    inquiry.paymentDueAt ? new Date(inquiry.paymentDueAt).toISOString().slice(0, 10) : "",
  );
  const [paymentReceivedAt, setPaymentReceivedAt] = useState(
    inquiry.paymentReceivedAt
      ? new Date(inquiry.paymentReceivedAt).toISOString().slice(0, 10)
      : "",
  );
  const [saving, setSaving] = useState(false);
  const stageRanks: Record<string, number> = {
    New: 0,
    Contacted: 1,
    SampleSent: 2,
    OrderReceived: 3,
    OrderStatus: 4,
    OrderSent: 5,
    Won: 6,
    Lost: 7,
  };
  const currentRank = stageRanks[stage] ?? 999;
  const previousStageCards = [
    {
      key: "SampleSent",
      rank: stageRanks.SampleSent,
      title: "Sample",
      tone: "amber" as const,
      hasData: Boolean(sampleDecision || savedSampleDetails.quantity || savedSampleDetails.product),
      content: (
        <>
          <MiniInfo label="Status" value={sampleDecision ? SAMPLE_DECISION_LABELS[sampleDecision] ?? sampleDecision : "—"} />
          <MiniInfo label="Product" value={sampleProduct || "—"} />
          <MiniInfo label="Quantity" value={sampleQuantity ? `${sampleQuantity} ${sampleQuantityType}` : "—"} />
        </>
      ),
    },
    {
      key: "OrderReceived",
      rank: stageRanks.OrderReceived,
      title: "Order Received",
      tone: "teal" as const,
      hasData: Boolean(savedOrderDetails.amount || savedOrderDetails.product),
      content: (
        <>
          <MiniInfo label="Amount" value={savedOrderDetails.amount || "—"} />
          <MiniInfo label="Product" value={savedOrderDetails.product || "—"} />
          <MiniInfo
            label="Advance payment"
            value={savedOrderDetails.advancePaymentRequired ? "Required" : "Not required"}
          />
        </>
      ),
    },
    {
      key: "OrderStatus",
      rank: stageRanks.OrderStatus,
      title: "Order Status",
      tone: "sky" as const,
      hasData: Boolean(savedOrderStatusDetails.status),
      content: (
        <>
          <MiniInfo label="Status" value={savedOrderStatusDetails.status || "—"} />
          <MiniInfo label="Invoice" value={savedOrderStatusDetails.invoiceName || "—"} />
          <MiniInfo label="Notes" value={savedOrderStatusDetails.notes || "—"} />
        </>
      ),
    },
    {
      key: "OrderSent",
      rank: stageRanks.OrderSent,
      title: "Order Sent",
      tone: "cyan" as const,
      hasData: Boolean(savedOrderSentDetails.dispatchDate || savedOrderSentDetails.dispatchMethod || savedOrderSentDetails.sentBy),
      content: (
        <>
          <MiniInfo label="Sent date" value={savedOrderSentDetails.dispatchDate || "—"} />
          <MiniInfo label="Dispatch method" value={savedOrderSentDetails.dispatchMethod || "—"} />
          <MiniInfo label="Sent by" value={savedOrderSentDetails.sentBy || "—"} />
          <MiniInfo label="Tracking / LR" value={savedOrderSentDetails.trackingDetails || "—"} />
        </>
      ),
    },
    {
      key: "Won",
      rank: stageRanks.Won,
      title: "Payment",
      tone: "emerald" as const,
      hasData: Boolean(inquiry.paymentStatus || savedPaymentDetails.amount || savedPaymentDetails.method),
      content: (
        <>
          <MiniInfo label="Status" value={inquiry.paymentStatus ? PAYMENT_STATUS_LABELS[inquiry.paymentStatus] ?? inquiry.paymentStatus : "—"} />
          <MiniInfo label="Amount received" value={savedPaymentDetails.amount || "—"} />
          <MiniInfo label="Method" value={savedPaymentDetails.method || "—"} />
          <MiniInfo
            label="Due / received"
            value={[
              inquiry.paymentDueAt ? `Due ${new Date(inquiry.paymentDueAt).toLocaleDateString()}` : "",
              inquiry.paymentReceivedAt ? `Received ${new Date(inquiry.paymentReceivedAt).toLocaleDateString()}` : "",
            ].filter(Boolean).join(" · ") || "—"}
          />
        </>
      ),
    },
  ]
    .filter((card) => card.hasData && card.rank < currentRank)
    .reverse();

  async function save() {
    if (stage === "OrderSent" && orderAdvancePaymentRequired && paymentStatus !== "Received") {
      alert("Advance payment required for this order before it can be marked as order sent.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/inquiries/${inquiry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage,
        sampleDecision: stage === "SampleSent" ? sampleDecision || null : null,
        sampleQuantity:
          stage === "SampleSent" && sampleDecision !== "SampleNotRequired" && sampleQuantity
            ? Number(sampleQuantity)
            : null,
        sampleQuantityType:
          stage === "SampleSent" && sampleDecision !== "SampleNotRequired"
            ? sampleQuantityType || null
            : null,
        sampleProduct:
          stage === "SampleSent" && sampleDecision !== "SampleNotRequired"
            ? sampleProduct || null
            : null,
        orderAmount: stage === "OrderReceived" && orderAmount ? Number(orderAmount) : null,
        orderProduct: stage === "OrderReceived" ? orderProduct || null : null,
        orderAdvancePaymentRequired: stage === "OrderReceived" ? orderAdvancePaymentRequired : null,
        orderStatus: stage === "OrderStatus" ? orderStatus || null : null,
        orderStatusInvoiceName: stage === "OrderStatus" ? orderStatusInvoiceName || null : null,
        orderStatusNotes: stage === "OrderStatus" ? orderStatusNotes || null : null,
        orderSentDispatchDate: stage === "OrderSent" ? orderSentDispatchDate || null : null,
        orderSentDispatchMethod: stage === "OrderSent" ? orderSentDispatchMethod || null : null,
        orderSentSentBy: stage === "OrderSent" ? orderSentSentBy || null : null,
        orderSentTrackingDetails: stage === "OrderSent" ? orderSentTrackingDetails || null : null,
        orderSentInvoiceName: null,
        notes,
        nextActionAt,
        nextActionNote,
        salesPersonId: salesPersonId || null,
        paymentStatus: paymentStatus || null,
        paymentAmount: paymentStatus === "Received" && paymentAmount ? Number(paymentAmount) : null,
        paymentMethod: paymentStatus === "Received" ? paymentMethod || null : null,
        paymentDueAt: paymentDueAt || null,
        paymentReceivedAt:
          paymentStatus === "Received"
            ? paymentReceivedAt || new Date().toISOString().slice(0, 10)
            : paymentReceivedAt || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Could not save changes.");
      return;
    }
    router.push(returnHref);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Archive this inquiry? It will be hidden from active dashboards but kept for analysis.")) return;
    const res = await fetch(`/api/inquiries/${inquiry.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Could not archive this inquiry.");
      return;
    }
    router.push(returnHref);
    router.refresh();
  }

  return (
    <div>
      <Link href={returnHref} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> {returnLabel}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">{inquiry.companyName}</h1>
          <p className="text-sm text-slate-600">
            {inquiry.contactName} · {inquiry.country}
            {inquiry.city ? `, ${inquiry.city}` : ""} · {inquiry.customerType}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded border px-2 py-1 text-xs font-medium ${STAGE_COLORS[inquiry.stage]}`}
          >
            {STAGE_LABELS[inquiry.stage] ?? inquiry.stage}
          </span>
          {inquiry.stage === "Won" && inquiry.paymentStatus ? (
            <span
              className={`rounded border px-2 py-1 text-xs font-medium ${PAYMENT_STATUS_COLORS[inquiry.paymentStatus] ?? "border-slate-200 bg-white text-slate-600"}`}
            >
              {PAYMENT_STATUS_LABELS[inquiry.paymentStatus] ?? inquiry.paymentStatus}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {!isOwner &&
        (inquiry.ownerFollowUpRequest || inquiry.ownerRequestedChanges) &&
        inquiry.ownerRequestStatus !== "Handled" ? (
          <Card title="Owner request">
            <OwnerRequestNotice inquiry={inquiry} />
          </Card>
        ) : null}

          <Card title={`${STAGE_LABELS[stage] ?? stage} details`}>
            {stage === "SampleSent" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <EditField label="Sample option">
                    <select
                      className="select"
                      value={sampleDecision}
                      onChange={(e) => setSampleDecision(e.target.value)}
                    >
                      <option value="">Select sample outcome</option>
                      {SAMPLE_DECISIONS.map((decision) => (
                        <option key={decision} value={decision}>
                          {SAMPLE_DECISION_LABELS[decision]}
                        </option>
                      ))}
                    </select>
                  </EditField>

                  {sampleDecision !== "SampleNotRequired" ? (
                    <>
                      <EditField label="Sample product">
                        <select
                          className="select"
                          value={sampleProduct}
                          onChange={(e) => setSampleProduct(e.target.value)}
                        >
                          <option value="">Select product</option>
                          {PRODUCTS.map((product) => (
                            <option key={product} value={product}>
                              {product}
                            </option>
                          ))}
                        </select>
                      </EditField>
                      <EditField label="Quantity">
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={sampleQuantity}
                          onChange={(e) => setSampleQuantity(e.target.value)}
                          placeholder="e.g. 2"
                        />
                      </EditField>
                      <EditField label="Quantity type">
                        <select
                          className="select"
                          value={sampleQuantityType}
                          onChange={(e) => setSampleQuantityType(e.target.value)}
                        >
                          <option value="">Select type</option>
                          {UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </EditField>
                    </>
                  ) : null}
                </div>
                {sampleDecision === "SampleNotRequired" ? (
                  <p className="text-xs text-slate-600">
                    This inquiry is marked as sample not required.
                  </p>
                ) : null}
              </div>
            ) : stage === "OrderReceived" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <EditField label="Order amount received">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                </EditField>
                <EditField label="Order product">
                  <select
                    className="select"
                    value={orderProduct}
                    onChange={(e) => setOrderProduct(e.target.value)}
                  >
                    <option value="">Select product</option>
                    {PRODUCTS.map((product) => (
                      <option key={product} value={product}>
                        {product}
                      </option>
                    ))}
                  </select>
                </EditField>
                <label className="flex items-start gap-2 rounded-md border border-teal-100 bg-teal-50/70 px-3 py-2 text-sm font-medium text-teal-950">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-teal-300 text-teal-700"
                    checked={orderAdvancePaymentRequired}
                    onChange={(e) => setOrderAdvancePaymentRequired(e.target.checked)}
                  />
                  <span>
                    Advance payment required
                    <span className="mt-0.5 block text-xs font-normal text-teal-800/75">
                      Blocks Order Sent until payment is received.
                    </span>
                  </span>
                </label>
              </div>
            ) : stage === "OrderStatus" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <EditField label="Order status">
                  <select
                    className="select"
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                  >
                    <option value="Order in progress">Order in progress</option>
                    <option value="Order ready">Order ready</option>
                  </select>
                </EditField>
                {orderStatus === "Order ready" ? (
                  <EditField label="Invoice (optional)">
                    <input
                      className="input"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setOrderStatusInvoiceName(e.target.files?.[0]?.name ?? "")}
                    />
                    {orderStatusInvoiceName ? (
                      <p className="mt-1 text-xs font-medium text-sky-800">
                        Selected invoice: {orderStatusInvoiceName}
                      </p>
                    ) : null}
                  </EditField>
                ) : null}
                <EditField label="Notes">
                  <input
                    className="input"
                    value={orderStatusNotes}
                    onChange={(e) => setOrderStatusNotes(e.target.value)}
                    placeholder="Optional production or packing update"
                  />
                </EditField>
              </div>
            ) : stage === "OrderSent" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <EditField label="Sent date">
                  <input
                    className="input"
                    type="date"
                    value={orderSentDispatchDate}
                    onChange={(e) => setOrderSentDispatchDate(e.target.value)}
                  />
                </EditField>
                <EditField label="Sent by">
                  <input
                    className="input"
                    value={orderSentSentBy}
                    onChange={(e) => setOrderSentSentBy(e.target.value)}
                    placeholder="e.g. Rajesh"
                  />
                </EditField>
                <EditField label="Dispatch method">
                  <input
                    className="input"
                    value={orderSentDispatchMethod}
                    onChange={(e) => setOrderSentDispatchMethod(e.target.value)}
                    placeholder="e.g. Transport, courier"
                  />
                </EditField>
                <EditField label="Tracking / LR details">
                  <input
                    className="input"
                    value={orderSentTrackingDetails}
                    onChange={(e) => setOrderSentTrackingDetails(e.target.value)}
                    placeholder="Optional"
                  />
                </EditField>
              </div>
            ) : stage === "Won" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <EditField label="Payment status">
                    <select
                      className="select"
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                    >
                      <option value="">Not started</option>
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {PAYMENT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </EditField>

                  <EditField label="Payment due by">
                    <input
                      className="input"
                      type="date"
                      value={paymentDueAt}
                      onChange={(e) => setPaymentDueAt(e.target.value)}
                    />
                  </EditField>

                  {paymentStatus === "Received" ? (
                    <>
                      <EditField label="Amount received">
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="e.g. 25000"
                        />
                      </EditField>
                      <EditField label="Payment method">
                        <select
                          className="select"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="">Select method</option>
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </EditField>
                      <EditField label="Payment received on">
                        <input
                          className="input"
                          type="date"
                          value={paymentReceivedAt}
                          onChange={(e) => setPaymentReceivedAt(e.target.value)}
                        />
                      </EditField>
                    </>
                  ) : null}
                </div>
                {paymentStatus && paymentStatus !== "Received" && paymentDueAt ? (
                  <p className="text-xs text-slate-600">
                    You&apos;ll see a payment-follow-up reminder on your home page after this
                    date, repeating every 3 days until marked received.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No extra stage details are required yet. Use the update section below to change the
                stage, next action, or assigned sales rep.
              </p>
            )}
          </Card>

          <div className="-mt-2 flex justify-end">
            <button
              className="btn-primary w-full sm:w-auto"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving…" : "Save stage changes"}
            </button>
          </div>

          {previousStageCards.length > 0 ? (
            <Card title="Previous stage details">
              <p className="mb-3 text-xs text-slate-500">
                Earlier stage information is kept here as the customer moves through the pipeline.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {previousStageCards.map((card) => (
                  <StageHistoryCard key={card.key} title={card.title} tone={card.tone}>
                    {card.content}
                  </StageHistoryCard>
                ))}
              </div>
            </Card>
          ) : null}

          <Card title="Customer information">
            <EditableCustomerForm inquiry={inquiry} returnHref={returnHref} />
          </Card>

          <Card title="Update">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <EditField label="Stage">
                <select
                  className="select"
                  value={stage}
                  onChange={(e) => {
                    setStage(e.target.value);
                    if (e.target.value !== "SampleSent") setSampleDecision("");
                  }}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </EditField>

              <EditField label="Assigned Sales Rep">
                <select
                  className="select"
                  value={salesPersonId}
                  onChange={(e) => setSalesPersonId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </EditField>

              <EditField label="Next Action Date">
                <input
                  className="input"
                  type="date"
                  value={nextActionAt}
                  onChange={(e) => setNextActionAt(e.target.value)}
                />
              </EditField>

              <div className="sm:col-span-2 lg:col-span-3">
                <EditField label="Next Action Note">
                  <input
                    className="input"
                    value={nextActionNote}
                    onChange={(e) => setNextActionNote(e.target.value)}
                    placeholder="e.g. Send COA"
                  />
                </EditField>
              </div>
            </div>

            <div className="mt-4">
              <EditField label="Notes">
                <textarea
                  className="textarea min-h-[120px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Call summary, requirements…"
                />
              </EditField>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                className="btn-primary w-full sm:w-auto"
                disabled={saving}
                onClick={save}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </Card>

          {isOwner ? (
            <Card title="Request sales rep action">
              <OwnerRequestForm inquiry={inquiry} />
            </Card>
          ) : null}

          <Card title="Follow-up actions">
            <FollowUpActions inquiry={inquiry} />
          </Card>

          {canDelete ? (
            <Card title="Danger zone">
              <button
                className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 sm:w-auto"
                onClick={remove}
              >
                <Trash2 className="h-4 w-4" /> Archive inquiry
              </button>
            </Card>
          ) : null}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-soft">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700/80">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StageHistoryCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "amber" | "teal" | "sky" | "cyan" | "emerald";
  children: React.ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    amber: "border-amber-200 bg-amber-50/60",
    teal: "border-teal-200 bg-teal-50/60",
    sky: "border-sky-200 bg-sky-50/60",
    cyan: "border-cyan-200 bg-cyan-50/60",
    emerald: "border-emerald-200 bg-emerald-50/60",
  };

  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
        {title}
      </h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function DL({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-3 gap-y-2 text-sm">{children}</dl>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="col-span-1 text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-800">{children}</dd>
    </>
  );
}

function StageWithSampleDecision({ inquiry }: { inquiry: Inquiry }) {
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${STAGE_COLORS[inquiry.stage]}`}
      >
        {STAGE_LABELS[inquiry.stage] ?? inquiry.stage}
      </span>
      {inquiry.stage === "SampleSent" && inquiry.sampleDecision ? (
        <span className="text-xs text-slate-600">
          {SAMPLE_DECISION_LABELS[inquiry.sampleDecision] ?? inquiry.sampleDecision}
        </span>
      ) : null}
    </span>
  );
}

function OwnerRequestForm({ inquiry }: { inquiry: Inquiry }) {
  const router = useRouter();
  const [followUpRequest, setFollowUpRequest] = useState(inquiry.ownerFollowUpRequest ?? "");
  const [requestedChanges, setRequestedChanges] = useState(inquiry.ownerRequestedChanges ?? "");
  const [saving, setSaving] = useState(false);

  async function sendRequest() {
    if (!followUpRequest.trim() && !requestedChanges.trim()) {
      alert("Add a follow-up instruction or customer detail change request first.");
      return;
    }

    setSaving(true);
    const nextActionNote = [
      followUpRequest.trim() ? `Owner follow-up request: ${followUpRequest.trim()}` : "",
      requestedChanges.trim() ? `Customer detail changes requested: ${requestedChanges.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await fetch(`/api/inquiries/${inquiry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerFollowUpRequest: followUpRequest.trim() || null,
        ownerRequestedChanges: requestedChanges.trim() || null,
        ownerRequestStatus: "Open",
        ownerRequestAt: new Date().toISOString(),
        nextActionNote,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Could not send request to the sales rep.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Ask the assigned sales rep to follow up or correct customer details. The request appears on
        this inquiry for the rep to handle.
      </p>
      {!inquiry.salesPersonName && !inquiry.assignedTo ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Assign a sales rep so the right person sees this request.
        </div>
      ) : null}
      <div>
        <label className="label">Follow-up instruction</label>
        <textarea
          className="textarea min-h-[100px]"
          value={followUpRequest}
          onChange={(e) => setFollowUpRequest(e.target.value)}
          placeholder="e.g. Call tomorrow and confirm sample requirement."
        />
      </div>
      <div>
        <label className="label">Customer detail changes needed</label>
        <textarea
          className="textarea min-h-[100px]"
          value={requestedChanges}
          onChange={(e) => setRequestedChanges(e.target.value)}
          placeholder="e.g. Verify phone number, update shop name, add missing email."
        />
      </div>
      {inquiry.ownerRequestAt ? (
        <p className="text-xs text-slate-500">
          Last sent {new Date(inquiry.ownerRequestAt).toLocaleString()} ·{" "}
          {inquiry.ownerRequestStatus ?? "Open"}
        </p>
      ) : null}
      <button
        className="btn-primary inline-flex w-full items-center justify-center gap-1"
        disabled={saving}
        onClick={sendRequest}
      >
        <Send className="h-4 w-4" />
        {saving ? "Sending…" : "Send request to sales rep"}
      </button>
    </div>
  );
}

function OwnerRequestNotice({ inquiry }: { inquiry: Inquiry }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function markHandled() {
    setSaving(true);
    const res = await fetch(`/api/inquiries/${inquiry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerRequestStatus: "Handled" }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Could not mark owner request handled.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {inquiry.ownerRequestAt ? (
        <p className="text-xs text-slate-500">
          Sent by owner {new Date(inquiry.ownerRequestAt).toLocaleString()}
        </p>
      ) : null}
      {inquiry.ownerFollowUpRequest ? (
        <div>
          <div className="label">Follow-up instruction</div>
          <p className="whitespace-pre-wrap rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-900">
            {inquiry.ownerFollowUpRequest}
          </p>
        </div>
      ) : null}
      {inquiry.ownerRequestedChanges ? (
        <div>
          <div className="label">Customer details to update</div>
          <p className="whitespace-pre-wrap rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {inquiry.ownerRequestedChanges}
          </p>
        </div>
      ) : null}
      <button
        className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
        disabled={saving}
        onClick={markHandled}
      >
        <CheckCircle2 className="h-4 w-4" />
        {saving ? "Saving…" : "Mark request handled"}
      </button>
    </div>
  );
}

function EditableCustomerForm({ inquiry, returnHref }: { inquiry: Inquiry; returnHref: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: inquiry.companyName,
    contactName: inquiry.contactName,
    email: inquiry.email ?? "",
    phone: inquiry.phone ?? "",
    country: inquiry.country,
    city: inquiry.city ?? "",
    customerType: inquiry.customerType,
    source: inquiry.source,
    product: inquiry.product,
    productNotes: inquiry.productNotes ?? "",
    quantity: inquiry.quantity?.toString() ?? "",
    quantityUnit: inquiry.quantityUnit ?? "",
    packaging: inquiry.packaging ?? "",
    estimatedValue: inquiry.estimatedValue?.toString() ?? "",
    currency: inquiry.currency ?? "USD",
    expectedCloseAt: inquiry.expectedCloseAt
      ? new Date(inquiry.expectedCloseAt).toISOString().slice(0, 10)
      : "",
    regulatoryNotes: inquiry.regulatoryNotes ?? "",
  });
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveCustomerInfo() {
    if (!form.companyName.trim() || !form.contactName.trim() || !form.country.trim()) {
      alert("Company, contact name, and country are required.");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/inquiries/${inquiry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        country: form.country.trim(),
        city: form.city.trim() || null,
        customerType: form.customerType.trim() || "Other",
        source: form.source.trim() || "Other",
        product: form.product.trim(),
        productNotes: form.productNotes.trim() || null,
        quantity: form.quantity ? Number(form.quantity) : null,
        quantityUnit: form.quantityUnit.trim() || null,
        packaging: form.packaging.trim() || null,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
        currency: form.currency.trim() || "USD",
        expectedCloseAt: form.expectedCloseAt || null,
        regulatoryNotes: form.regulatoryNotes.trim() || null,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Could not update customer information.");
      return;
    }
    router.push(returnHref);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <EditField label="Company / farm / shop">
          <input
            className="input"
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
          />
        </EditField>
        <EditField label="Contact name">
          <input
            className="input"
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
          />
        </EditField>
        <EditField label="Email">
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </EditField>
        <EditField label="Phone">
          <input
            className="input"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </EditField>
        <EditField label="Country">
          <input
            className="input"
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
          />
        </EditField>
        <EditField label="City / region">
          <input
            className="input"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </EditField>
        <EditField label="Customer type">
          <input
            className="input"
            value={form.customerType}
            onChange={(e) => update("customerType", e.target.value)}
          />
        </EditField>
        <EditField label="Source">
          <input
            className="input"
            value={form.source}
            onChange={(e) => update("source", e.target.value)}
          />
        </EditField>
        <EditField label="Product">
          <input
            className="input"
            value={form.product}
            onChange={(e) => update("product", e.target.value)}
          />
        </EditField>
        <EditField label="Product notes">
          <input
            className="input"
            value={form.productNotes}
            onChange={(e) => update("productNotes", e.target.value)}
          />
        </EditField>
        <EditField label="Quantity">
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
          />
        </EditField>
        <EditField label="Unit">
          <input
            className="input"
            value={form.quantityUnit}
            onChange={(e) => update("quantityUnit", e.target.value)}
          />
        </EditField>
        <EditField label="Packaging">
          <input
            className="input"
            value={form.packaging}
            onChange={(e) => update("packaging", e.target.value)}
          />
        </EditField>
        <EditField label="Estimated value">
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={form.estimatedValue}
            onChange={(e) => update("estimatedValue", e.target.value)}
          />
        </EditField>
        <EditField label="Currency">
          <input
            className="input"
            value={form.currency}
            onChange={(e) => update("currency", e.target.value)}
          />
        </EditField>
        <EditField label="Expected close">
          <input
            className="input"
            type="date"
            value={form.expectedCloseAt}
            onChange={(e) => update("expectedCloseAt", e.target.value)}
          />
        </EditField>
      </div>

      <EditField label="Regulatory / compliance notes">
        <textarea
          className="textarea min-h-[90px]"
          value={form.regulatoryNotes}
          onChange={(e) => update("regulatoryNotes", e.target.value)}
        />
      </EditField>

      <button className="btn-primary w-full" disabled={saving} onClick={saveCustomerInfo}>
        {saving ? "Saving…" : "Save customer information"}
      </button>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
