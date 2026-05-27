"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
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

type Inquiry = {
  id: string;
  companyName: string;
  contactName: string;
  assignedTo: string | null;
  salesPerson: { firstName: string; lastName: string } | null;
  stage: string;
  sampleDecision: string | null;
  paymentStatus: string | null;
  paymentReceivedAt: string | Date | null;
  notes: string | null;
  email: string | null;
  phone: string | null;
  product: string;
  productNotes: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  packaging: string | null;
};

export default function Pipeline({ inquiries }: { inquiries: Inquiry[] }) {
  const stageOrder: Record<string, number> = STAGES.reduce(
    (acc, s, idx) => ({ ...acc, [s]: idx }),
    {},
  );

  const stageStats = STAGES.map((stage) => {
    const items = inquiries.filter((i) => i.stage === stage);
    return { stage, count: items.length };
  });

  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");

  const sorted = [...inquiries].sort((a, b) => {
    const sa = stageOrder[a.stage] ?? 999;
    const sb = stageOrder[b.stage] ?? 999;
    if (sa !== sb) return sa - sb;
    return a.companyName.localeCompare(b.companyName);
  });

  const needle = query.trim().toLowerCase();
  const visible = sorted.filter((i) => {
    const matchesQuery = needle
      ? [i.companyName, i.contactName, i.email, i.phone, i.product]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      : true;
    const matchesStage = stageFilter ? i.stage === stageFilter : true;
    const matchesPayment =
      stageFilter === "Won" && paymentStatusFilter
        ? (i.paymentStatus ?? "") === paymentStatusFilter
        : true;

    return matchesQuery && matchesStage && matchesPayment;
  });

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, contact, email, phone, product…"
          className="w-full max-w-md rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        <select
          aria-label="Filter by stage"
          value={stageFilter}
          onChange={(e) => {
            setStageFilter(e.target.value);
            if (e.target.value !== "Won") setPaymentStatusFilter("");
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        >
          <option value="">All stages</option>
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
        {stageFilter === "Won" ? (
          <select
            aria-label="Filter payment stage by payment status"
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">All payment statuses</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        ) : null}
        {query || stageFilter || paymentStatusFilter ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStageFilter("");
              setPaymentStatusFilter("");
            }}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        ) : null}
        <span className="text-[11px] text-muted">
          {visible.length} of {sorted.length} shown
        </span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
        {stageStats.map(({ stage, count }) => (
          <div
            key={stage}
            className={`rounded border px-1.5 py-1 ${STAGE_COLORS[stage] ?? "border-slate-200 bg-white text-slate-700"}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.06em]">
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-xs font-semibold">{count}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
            <tr>
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th>Sales Rep</Th>
              <Th>Stage</Th>
              <Th>Follow-Up</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border-b border-slate-200 p-8 text-center text-sm text-slate-500"
                >
                  {sorted.length === 0
                    ? "No inquiries yet. Add one from the \"New Inquiry\" page."
                    : "No matches. Try a different search term."}
                </td>
              </tr>
            ) : (
              visible.map((i) => <Row key={i.id} inquiry={i} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ inquiry }: { inquiry: Inquiry }) {
  const router = useRouter();
  const [stage, setStage] = useState(inquiry.stage);
  const [sampleDecision, setSampleDecision] = useState(inquiry.sampleDecision ?? "");
  const [sampleModalStep, setSampleModalStep] = useState<"closed" | "required-choice" | "sent-choice">("closed");
  const savedSampleDetails = readSampleDetails(inquiry.notes);
  const [sampleQuantity, setSampleQuantity] = useState(savedSampleDetails.quantity);
  const [sampleQuantityType, setSampleQuantityType] = useState(savedSampleDetails.unit || inquiry.quantityUnit || "L");
  const [sampleProduct, setSampleProduct] = useState(savedSampleDetails.product || inquiry.product);
  const savedOrderDetails = readOrderDetails(inquiry.notes);
  const [orderAmount, setOrderAmount] = useState(savedOrderDetails.amount);
  const [orderProduct, setOrderProduct] = useState(savedOrderDetails.product || inquiry.product);
  const [orderAdvancePaymentRequired, setOrderAdvancePaymentRequired] = useState(
    savedOrderDetails.advancePaymentRequired,
  );
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const savedOrderStatusDetails = readOrderStatusDetails(inquiry.notes);
  const [orderStatus, setOrderStatus] = useState(savedOrderStatusDetails.status || "Order in progress");
  const [orderStatusInvoiceName, setOrderStatusInvoiceName] = useState(savedOrderStatusDetails.invoiceName);
  const [orderStatusNotes, setOrderStatusNotes] = useState(savedOrderStatusDetails.notes);
  const [orderStatusModalOpen, setOrderStatusModalOpen] = useState(false);
  const savedOrderSentDetails = readOrderSentDetails(inquiry.notes);
  const [orderSentDispatchDate, setOrderSentDispatchDate] = useState(
    savedOrderSentDetails.dispatchDate || new Date().toISOString().slice(0, 10),
  );
  const [orderSentDispatchMethod, setOrderSentDispatchMethod] = useState(savedOrderSentDetails.dispatchMethod);
  const [orderSentSentBy, setOrderSentSentBy] = useState(savedOrderSentDetails.sentBy);
  const [orderSentTrackingDetails, setOrderSentTrackingDetails] = useState(savedOrderSentDetails.trackingDetails);
  const [orderSentModalOpen, setOrderSentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(inquiry.paymentStatus ?? "");
  const savedPaymentDetails = readPaymentDetails(inquiry.notes);
  const [paymentAmount, setPaymentAmount] = useState(savedPaymentDetails.amount);
  const [paymentMethod, setPaymentMethod] = useState(savedPaymentDetails.method);
  const [paymentReceivedAt, setPaymentReceivedAt] = useState(
    inquiry.paymentReceivedAt ? new Date(inquiry.paymentReceivedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sampleInlineMessage, setSampleInlineMessage] = useState("");
  const showPayment = stage === "Won";
  const showOrderDetails = stage === "OrderReceived";
  const showOrderStatusDetails = stage === "OrderStatus";
  const showOrderSentDetails = stage === "OrderSent";

  async function patchInquiry(body: Record<string, unknown>, rollback: () => void) {
    setUpdating(true);
    const res = await fetch(`/api/inquiries/${inquiry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setUpdating(false);
    if (!res.ok) {
      rollback();
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Could not update.");
      return;
    }
    router.refresh();
  }

  function updateStage(value: string) {
    const previous = stage;
    const previousSampleDecision = sampleDecision;
    if (value === "SampleSent") {
      setStage("SampleSent");
      setSampleModalStep("required-choice");
      return;
    }
    if (value === "OrderReceived") {
      setStage("OrderReceived");
      setOrderModalOpen(true);
      return;
    }
    if (value === "OrderStatus") {
      setStage("OrderStatus");
      setOrderStatusModalOpen(true);
      return;
    }
    if (value === "OrderSent") {
      if (orderAdvancePaymentRequired && paymentStatus !== "Received") {
        alert("Advance payment required for this order before it can be marked as order sent.");
        setStage(previous);
        return;
      }
      setStage("OrderSent");
      setOrderSentModalOpen(true);
      return;
    }

    setStage(value);
    if (value !== "SampleSent") setSampleDecision("");
    void patchInquiry(
      {
        stage: value,
        sampleDecision: value === "SampleSent" ? sampleDecision || null : null,
        sampleQuantity: null,
        sampleQuantityType: null,
        sampleProduct: null,
        orderAmount: null,
        orderProduct: null,
        orderAdvancePaymentRequired: null,
        orderStatus: null,
        orderStatusInvoiceName: null,
        orderStatusNotes: null,
        orderSentDispatchDate: null,
        orderSentDispatchMethod: null,
        orderSentSentBy: null,
        orderSentTrackingDetails: null,
        orderSentInvoiceName: null,
      },
      () => {
        setStage(previous);
        setSampleDecision(previousSampleDecision);
      },
    );
  }

  function saveSampleDecision(nextDecision: string) {
    if (nextDecision !== "SampleNotRequired") {
      if (!sampleQuantity || Number(sampleQuantity) <= 0) {
        alert("Enter the sample quantity.");
        return;
      }
      if (!sampleProduct) {
        alert("Select the sample product.");
        return;
      }
      if (!sampleQuantityType) {
        alert("Select the sample quantity type.");
        return;
      }
    }

    const previous = stage;
    const previousSampleDecision = sampleDecision;
    setStage("SampleSent");
    setSampleDecision(nextDecision);
    setSampleModalStep("closed");
    void patchInquiry(
      {
        stage: "SampleSent",
        sampleDecision: nextDecision,
        sampleQuantity: nextDecision === "SampleNotRequired" ? null : Number(sampleQuantity),
        sampleQuantityType: nextDecision === "SampleNotRequired" ? null : sampleQuantityType,
        sampleProduct: nextDecision === "SampleNotRequired" ? null : sampleProduct,
      },
      () => {
        setStage(previous);
        setSampleDecision(previousSampleDecision);
      },
    );
  }

  function updateSampleStatusInline(nextDecision: string) {
    const previous = sampleDecision;
    setSampleInlineMessage("");
    if (nextDecision !== "SampleNotRequired" && (!sampleQuantity || !sampleProduct || !sampleQuantityType)) {
      setSampleInlineMessage("Add sample product, quantity, and quantity type before changing this status.");
      setSampleModalStep("sent-choice");
      return;
    }

    setSampleDecision(nextDecision);
    void patchInquiry(
      {
        stage: "SampleSent",
        sampleDecision: nextDecision,
        sampleQuantity: nextDecision === "SampleNotRequired" ? null : Number(sampleQuantity),
        sampleQuantityType: nextDecision === "SampleNotRequired" ? null : sampleQuantityType,
        sampleProduct: nextDecision === "SampleNotRequired" ? null : sampleProduct,
      },
      () => {
        setSampleDecision(previous);
        setSampleInlineMessage("Could not update sample status. Please try again.");
      },
    );
  }

  function closeSampleModal() {
    if (updating) return;
    setSampleModalStep("closed");
    if (inquiry.stage !== "SampleSent") {
      setStage(inquiry.stage);
      setSampleDecision(inquiry.sampleDecision ?? "");
    }
  }

  function closeOrderModal() {
    if (updating) return;
    setOrderModalOpen(false);
    if (inquiry.stage !== "OrderReceived" && !savedOrderDetails.amount && !savedOrderDetails.product) {
      setStage(inquiry.stage);
    }
  }

  function saveOrderDetails() {
    if (!orderAmount || Number(orderAmount) <= 0) {
      alert("Enter the order amount received.");
      return;
    }
    if (!orderProduct) {
      alert("Select the product for this order.");
      return;
    }

    const previous = stage;
    setStage("OrderReceived");
    setOrderModalOpen(false);
    void patchInquiry(
      {
        stage: "OrderReceived",
        sampleDecision: null,
        orderAmount: Number(orderAmount),
        orderProduct,
        orderAdvancePaymentRequired,
      },
      () => setStage(previous),
    );
  }

  function closeOrderStatusModal() {
    if (updating) return;
    setOrderStatusModalOpen(false);
    if (inquiry.stage !== "OrderStatus" && !savedOrderStatusDetails.status) {
      setStage(inquiry.stage);
    }
  }

  function saveOrderStatusDetails() {
    if (!orderStatus) {
      alert("Select the order status.");
      return;
    }
    const previous = stage;
    setStage("OrderStatus");
    setOrderStatusModalOpen(false);
    void patchInquiry(
      {
        stage: "OrderStatus",
        sampleDecision: null,
        orderStatus,
        orderStatusInvoiceName: orderStatus === "Order ready" ? orderStatusInvoiceName : null,
        orderStatusNotes: orderStatusNotes.trim() || null,
      },
      () => setStage(previous),
    );
  }

  function updateOrderStatusInline(nextStatus: string) {
    const previous = orderStatus;
    setOrderStatus(nextStatus);

    void patchInquiry(
      {
        stage: "OrderStatus",
        sampleDecision: null,
        orderStatus: nextStatus,
        orderStatusInvoiceName: nextStatus === "Order ready" ? orderStatusInvoiceName : null,
        orderStatusNotes: orderStatusNotes.trim() || null,
      },
      () => setOrderStatus(previous),
    );
  }

  function closeOrderSentModal() {
    if (updating) return;
    setOrderSentModalOpen(false);
    if (
      inquiry.stage !== "OrderSent" &&
      !savedOrderSentDetails.dispatchDate &&
      !savedOrderSentDetails.dispatchMethod &&
      !savedOrderSentDetails.sentBy
    ) {
      setStage(inquiry.stage);
    }
  }

  function saveOrderSentDetails() {
    if (!orderSentDispatchDate) {
      alert("Select the order sent date.");
      return;
    }
    if (!orderSentDispatchMethod.trim()) {
      alert("Enter the dispatch method.");
      return;
    }
    if (!orderSentSentBy.trim()) {
      alert("Enter who sent the order.");
      return;
    }

    const previous = stage;
    setStage("OrderSent");
    setOrderSentModalOpen(false);
    void patchInquiry(
      {
        stage: "OrderSent",
        sampleDecision: null,
        orderSentDispatchDate,
        orderSentDispatchMethod: orderSentDispatchMethod.trim(),
        orderSentSentBy: orderSentSentBy.trim(),
        orderSentTrackingDetails: orderSentTrackingDetails.trim() || null,
        orderSentInvoiceName: null,
      },
      () => setStage(previous),
    );
  }

  function updatePayment(value: string) {
    const previous = paymentStatus;
    if (value === "Received") {
      setPaymentStatus("Received");
      setPaymentModalOpen(true);
      return;
    }

    setPaymentStatus(value);
    void patchInquiry(
      {
        paymentStatus: value || null,
        paymentAmount: null,
        paymentMethod: null,
        paymentReceivedAt: null,
      },
      () => setPaymentStatus(previous),
    );
  }

  function closePaymentModal() {
    if (updating) return;
    setPaymentModalOpen(false);
    if (inquiry.paymentStatus !== "Received" && !savedPaymentDetails.amount && !savedPaymentDetails.method) {
      setPaymentStatus(inquiry.paymentStatus ?? "");
    }
  }

  function savePaymentDetails() {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      alert("Enter the payment amount received.");
      return;
    }
    if (!paymentMethod) {
      alert("Select the payment method.");
      return;
    }

    const previous = paymentStatus;
    setPaymentStatus("Received");
    void patchInquiry(
      {
        paymentStatus: "Received",
        paymentAmount: Number(paymentAmount),
        paymentMethod,
        paymentReceivedAt: paymentReceivedAt || new Date().toISOString().slice(0, 10),
      },
      () => setPaymentStatus(previous),
    );
    setPaymentModalOpen(false);
  }

  const hasPaymentDetails = paymentStatus === "Received" && (paymentAmount || paymentMethod || paymentReceivedAt);
  const hasOrderDetails = showOrderDetails && (orderAmount || orderProduct);
  const hasOrderStatusDetails = showOrderStatusDetails && orderStatus;
  const hasOrderSentDetails =
    showOrderSentDetails && (orderSentDispatchDate || orderSentDispatchMethod || orderSentSentBy);
  const showSampleDetails = stage === "SampleSent" && sampleDecision;
  const sampleStatusLabel =
    sampleDecision === "SampleRequiredSent"
      ? "Sample sent"
      : sampleDecision === "SampleRequiredPending"
        ? "Sample required"
        : sampleDecision === "SampleNotRequired"
          ? "Sample not required"
          : "";
  const assignedRep = inquiry.salesPerson
    ? `${inquiry.salesPerson.firstName} ${inquiry.salesPerson.lastName}`.trim()
    : inquiry.assignedTo;

  return (
    <>
      <tr className="hover:bg-slate-50">
        <Td>
          <Link
            href={`/inquiries/${inquiry.id}?from=pipeline`}
            className="font-medium text-brand-700 hover:underline"
          >
            {inquiry.companyName}
          </Link>
        </Td>
        <Td className="text-slate-700">{inquiry.contactName || "—"}</Td>
        <Td className="text-slate-700">{assignedRep || <span className="text-slate-400">Unassigned</span>}</Td>
        <Td>
          <select
            aria-label="Stage"
            value={stage}
            disabled={updating}
            onChange={(e) => updateStage(e.target.value)}
            className={`w-full max-w-[160px] cursor-pointer rounded border px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition disabled:opacity-60 ${STAGE_COLORS[stage] ?? "border-slate-200 bg-white text-slate-700"}`}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          {sampleModalStep !== "closed" ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
              <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
                {sampleModalStep === "required-choice" ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      Sample stage
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{inquiry.companyName}</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Does this customer need a sample?
                    </p>
                    <div className="mt-5 grid gap-2">
                      <button
                        type="button"
                        onClick={() => setSampleModalStep("sent-choice")}
                        className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                      >
                        Sample required
                      </button>
                      <button
                        type="button"
                        onClick={() => saveSampleDecision("SampleNotRequired")}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Sample not required
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      Sample required
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{inquiry.companyName}</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Which product sample and quantity is required?
                    </p>
                    <div className="mt-4 grid gap-3">
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Sample product
                        <select
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
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
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Sample quantity
                        <input
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                          type="number"
                          min="0"
                          step="0.01"
                          value={sampleQuantity}
                          onChange={(e) => setSampleQuantity(e.target.value)}
                          placeholder="e.g. 2"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Quantity type
                        <select
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
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
                      </label>
                    </div>
                    <p className="mt-4 text-sm text-slate-600">
                      Update sample status.
                    </p>
                    <label className="mt-3 grid gap-1 text-sm font-medium text-slate-700">
                      Sample status
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                        value={sampleDecision || "SampleRequiredPending"}
                        onChange={(e) => setSampleDecision(e.target.value)}
                      >
                        <option value="SampleRequiredPending">Sample required</option>
                        <option value="SampleRequiredSent">Sample sent</option>
                      </select>
                    </label>
                    <div className="mt-5 grid gap-2">
                      <button
                        type="button"
                        onClick={() => saveSampleDecision(sampleDecision || "SampleRequiredPending")}
                        className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                      >
                        Save sample details
                      </button>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeSampleModal}
                  className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {orderModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
              <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Order received
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{inquiry.companyName}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Enter the order amount and product received from this customer.
                </p>
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Order amount
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      type="number"
                      min="0"
                      step="0.01"
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(e.target.value)}
                      placeholder="e.g. 50000"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Product
                    <select
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                  </label>
                  <label className="flex items-start gap-2 rounded-md border border-teal-100 bg-teal-50/60 px-3 py-2 text-sm font-medium text-teal-950">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-teal-300 text-teal-700"
                      checked={orderAdvancePaymentRequired}
                      onChange={(e) => setOrderAdvancePaymentRequired(e.target.checked)}
                    />
                    <span>
                      Advance payment required
                      <span className="mt-0.5 block text-xs font-normal text-teal-800/75">
                        Order cannot move to Order Sent until payment is received.
                      </span>
                    </span>
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeOrderModal}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={saveOrderDetails}
                    className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    Save order
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {orderStatusModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
              <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                  Order status
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{inquiry.companyName}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Track whether the order is still in progress or ready for dispatch.
                </p>
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Status
                    <select
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                    >
                      <option value="Order in progress">Order in progress</option>
                      <option value="Order ready">Order ready</option>
                    </select>
                  </label>
                  {orderStatus === "Order ready" ? (
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Invoice (optional)
                      <input
                        className="rounded-md border border-dashed border-sky-300 bg-sky-50/50 px-3 py-2 text-sm text-slate-700"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => setOrderStatusInvoiceName(e.target.files?.[0]?.name ?? "")}
                      />
                      {orderStatusInvoiceName ? (
                        <span className="text-xs font-medium text-sky-800">
                          Selected invoice: {orderStatusInvoiceName}
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Notes
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      value={orderStatusNotes}
                      onChange={(e) => setOrderStatusNotes(e.target.value)}
                      placeholder="Optional production or packing update"
                    />
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeOrderStatusModal}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={saveOrderStatusDetails}
                    className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                  >
                    Save status
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {orderSentModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
              <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  Order sent
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{inquiry.companyName}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Add dispatch details and attach the invoice reference for this sent order.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Sent date
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      type="date"
                      value={orderSentDispatchDate}
                      onChange={(e) => setOrderSentDispatchDate(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Sent by
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      value={orderSentSentBy}
                      onChange={(e) => setOrderSentSentBy(e.target.value)}
                      placeholder="e.g. Rajesh"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Dispatch method
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      value={orderSentDispatchMethod}
                      onChange={(e) => setOrderSentDispatchMethod(e.target.value)}
                      placeholder="e.g. Transport, courier"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    Tracking / LR details
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      value={orderSentTrackingDetails}
                      onChange={(e) => setOrderSentTrackingDetails(e.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeOrderSentModal}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={saveOrderSentDetails}
                    className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                  >
                    Save sent order
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </Td>
        <Td>
          <FollowUpActions inquiry={inquiry} compact />
        </Td>
      </tr>
      {showSampleDetails ? (
        <tr>
          <td colSpan={5} className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Sample details
                </p>
                <p className="mt-0.5 text-xs font-medium text-amber-900">
                  {sampleStatusLabel}
                  {sampleDecision !== "SampleNotRequired" && (sampleQuantity || sampleProduct)
                    ? ` · ${sampleQuantity || "—"} ${sampleQuantityType || ""} ${sampleProduct ? `for ${sampleProduct}` : ""}`.trim()
                    : ""}
                </p>
                {sampleInlineMessage ? (
                  <p className="mt-1 rounded border border-amber-200 bg-white/80 px-2 py-1 text-[11px] font-medium text-amber-800">
                    {sampleInlineMessage}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  aria-label="Sample status"
                  value={sampleDecision}
                  disabled={updating}
                  onChange={(e) => updateSampleStatusInline(e.target.value)}
                  className="rounded border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 outline-none hover:bg-amber-50 disabled:opacity-60"
                >
                  <option value="SampleRequiredPending">Sample required</option>
                  <option value="SampleRequiredSent">Sample sent</option>
                  <option value="SampleNotRequired">Sample not required</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSampleModalStep("sent-choice")}
                  className="rounded border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-50"
                >
                  Details
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
      {showOrderDetails ? (
        <tr>
          <td colSpan={5} className="border-b border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Order details
                </p>
                <p className="mt-0.5 text-xs font-medium text-teal-900">
                  {hasOrderDetails
                    ? `${formatMoney(Number(orderAmount || 0))} order received for ${
                        orderProduct || "selected product"
                      }. Advance payment ${orderAdvancePaymentRequired ? "required" : "not required"}.`
                    : "Order received. Add the amount and product details."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderModalOpen(true)}
                className="rounded border border-teal-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-50"
              >
                Details
              </button>
            </div>
          </td>
        </tr>
      ) : null}
      {showOrderStatusDetails ? (
        <tr>
          <td colSpan={5} className="border-b border-sky-200 bg-gradient-to-r from-sky-50 via-blue-50 to-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                  Order status
                </p>
                <p className="mt-0.5 text-xs font-medium text-sky-950">
                  {hasOrderStatusDetails
                    ? `${orderStatus}${orderStatusInvoiceName ? ` · Invoice: ${orderStatusInvoiceName}` : ""}.`
                    : "Add current order status."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  aria-label="Order sub status"
                  value={orderStatus}
                  disabled={updating}
                  onChange={(e) => updateOrderStatusInline(e.target.value)}
                  className="rounded border border-sky-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-sky-800 outline-none hover:bg-sky-50 disabled:opacity-60"
                >
                  <option value="Order in progress">Order in progress</option>
                  <option value="Order ready">Order ready</option>
                </select>
                <button
                  type="button"
                  onClick={() => setOrderStatusModalOpen(true)}
                  className="rounded border border-sky-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-50"
                >
                  Details
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
      {showOrderSentDetails ? (
        <tr>
          <td colSpan={5} className="border-b border-cyan-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  Order sent details
                </p>
                <p className="mt-0.5 text-xs font-medium text-cyan-950">
                  {hasOrderSentDetails
                    ? `Sent ${orderSentDispatchDate || "recently"} via ${orderSentDispatchMethod || "dispatch"} by ${orderSentSentBy || "team"}.`
                    : "Order sent. Add dispatch details."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderSentModalOpen(true)}
                className="rounded border border-cyan-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-50"
              >
                Details
              </button>
            </div>
          </td>
        </tr>
      ) : null}
      {showPayment ? (
        <tr>
          <td colSpan={5} className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-green-50 to-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Payment
                </p>
                <p className="mt-0.5 text-xs text-emerald-900/70">
                  Record payment status once the customer confirms the transaction.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Payment status"
                  value={paymentStatus}
                  disabled={updating}
                  onChange={(e) => updatePayment(e.target.value)}
                  className={`max-w-[160px] cursor-pointer rounded border px-2 py-1.5 text-[11px] font-medium transition disabled:opacity-60 ${
                    paymentStatus
                      ? PAYMENT_STATUS_COLORS[paymentStatus] ?? "border-slate-200 bg-white text-slate-700"
                      : "border-dashed border-emerald-300 bg-white text-emerald-700"
                  }`}
                >
                  <option value="">Set payment...</option>
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PAYMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                {hasPaymentDetails ? (
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(true)}
                    className="rounded border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    Details
                  </button>
                ) : null}
              </div>
            </div>
            {paymentModalOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
                <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Payment received
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{inquiry.companyName}</h3>
                  </div>
                  <div className="grid gap-3">
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Amount received
                      <input
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="e.g. 25000"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Payment method
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Received on
                      <input
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        type="date"
                        value={paymentReceivedAt}
                        onChange={(e) => setPaymentReceivedAt(e.target.value)}
                      />
                    </label>
                  </div>
                  {hasPaymentDetails ? (
                    <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                      {formatMoney(Number(paymentAmount || 0))} received through {paymentMethod || "—"}.
                    </div>
                  ) : null}
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closePaymentModal}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={savePaymentDetails}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Save payment
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-300 px-3 py-2 font-semibold last:border-r-0">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b border-r border-slate-200 px-3 py-2 last:border-r-0 ${className}`}>
      {children}
    </td>
  );
}

function formatMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}
