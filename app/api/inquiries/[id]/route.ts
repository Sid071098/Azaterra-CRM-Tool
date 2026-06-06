import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getMutationSession } from "@/lib/rbac";
import { removePaymentDetails, writePaymentDetails } from "@/lib/paymentDetails";
import { readOrderDetails, writeOrderDetails } from "@/lib/orderDetails";
import { writeOrderStatusDetails } from "@/lib/orderStatusDetails";
import { writeOrderSentDetails } from "@/lib/orderSentDetails";
import { removeSampleDetails, writeSampleDetails } from "@/lib/sampleDetails";
import { ensureInquiryArchiveColumns } from "@/lib/archiveSchema";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!readSession()) {
    return NextResponse.json({ error: "Sign in to view inquiries." }, { status: 401 });
  }
  const inquiry = await prisma.inquiry.findUnique({ where: { id: params.id } });
  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(inquiry);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureInquiryArchiveColumns();
  const session = getMutationSession();
  if (!session) {
    return NextResponse.json(
      { error: "Only signed-in Sales Reps or Owners can update inquiries." },
      { status: 403 },
    );
  }
  const body = await req.json();
  const data: Record<string, unknown> = {};
  const allowed = [
    "companyName",
    "contactName",
    "email",
    "phone",
    "country",
    "city",
    "customerType",
    "source",
    "product",
    "productNotes",
    "packaging",
    "stage",
    "sampleDecision",
    "currency",
    "assignedTo",
    "salesPersonId",
    "nextActionNote",
    "notes",
    "regulatoryNotes",
    "quantityUnit",
    "ownerFollowUpRequest",
    "ownerRequestedChanges",
    "ownerRequestStatus",
    "paymentStatus",
  ];
  for (const k of allowed) if (k in body) data[k] = body[k];
  if ("salesPersonId" in body) data.salesPersonId = body.salesPersonId || null;
  if ("quantity" in body) data.quantity = body.quantity ? Number(body.quantity) : null;
  if ("estimatedValue" in body)
    data.estimatedValue = body.estimatedValue ? Number(body.estimatedValue) : null;
  if ("paymentAmount" in body || "paymentMethod" in body) {
    const current = await prisma.inquiry.findUnique({
      where: { id: params.id },
      select: { notes: true },
    });
    const baseNotes = typeof body.notes === "string" ? body.notes : current?.notes ?? "";
    const amount = typeof body.paymentAmount === "number" || typeof body.paymentAmount === "string"
      ? String(body.paymentAmount)
      : "";
    const method = typeof body.paymentMethod === "string" ? body.paymentMethod : "";
    data.notes =
      body.paymentStatus === "Received" && amount && method
        ? writePaymentDetails(baseNotes, amount, method)
        : removePaymentDetails(baseNotes);
  }
  if ("sampleQuantity" in body || "sampleProduct" in body || "sampleQuantityType" in body) {
    const current = await prisma.inquiry.findUnique({
      where: { id: params.id },
      select: { notes: true },
    });
    const baseNotes = typeof data.notes === "string"
      ? data.notes
      : typeof body.notes === "string"
        ? body.notes
        : current?.notes ?? "";
    const quantity = typeof body.sampleQuantity === "number" || typeof body.sampleQuantity === "string"
      ? String(body.sampleQuantity)
      : "";
    const unit = typeof body.sampleQuantityType === "string" ? body.sampleQuantityType : "";
    const product = typeof body.sampleProduct === "string" ? body.sampleProduct : "";
    if (body.stage === "SampleSent" && body.sampleDecision !== "SampleNotRequired" && quantity && product) {
      data.notes = writeSampleDetails(baseNotes, quantity, unit, product);
    } else if (body.stage === "SampleSent" && body.sampleDecision === "SampleNotRequired") {
      data.notes = removeSampleDetails(baseNotes);
    }
  }
  if ("orderAmount" in body || "orderProduct" in body || "orderAdvancePaymentRequired" in body) {
    const current = await prisma.inquiry.findUnique({
      where: { id: params.id },
      select: { notes: true },
    });
    const baseNotes = typeof data.notes === "string"
      ? data.notes
      : typeof body.notes === "string"
        ? body.notes
        : current?.notes ?? "";
    const amount = typeof body.orderAmount === "number" || typeof body.orderAmount === "string"
      ? String(body.orderAmount)
      : "";
    const product = typeof body.orderProduct === "string" ? body.orderProduct : "";
    const advancePaymentRequired = Boolean(body.orderAdvancePaymentRequired);
    if (body.stage === "OrderReceived" && amount && product) {
      data.notes = writeOrderDetails(baseNotes, amount, product, advancePaymentRequired);
    }
  }
  if (
    "orderStatus" in body ||
    "orderStatusInvoiceName" in body ||
    "orderStatusNotes" in body
  ) {
    const current = await prisma.inquiry.findUnique({
      where: { id: params.id },
      select: { notes: true },
    });
    const baseNotes = typeof data.notes === "string"
      ? data.notes
      : typeof body.notes === "string"
        ? body.notes
        : current?.notes ?? "";
    const status = typeof body.orderStatus === "string" ? body.orderStatus : "";
    const invoiceName = typeof body.orderStatusInvoiceName === "string" ? body.orderStatusInvoiceName : "";
    const notes = typeof body.orderStatusNotes === "string" ? body.orderStatusNotes : "";
    if (body.stage === "OrderStatus" && status) {
      data.notes = writeOrderStatusDetails(baseNotes, { status, invoiceName, notes });
    }
  }
  if (
    "orderSentDispatchDate" in body ||
    "orderSentDispatchMethod" in body ||
    "orderSentSentBy" in body ||
    "orderSentTrackingDetails" in body ||
    "orderSentInvoiceName" in body
  ) {
    const current = await prisma.inquiry.findUnique({
      where: { id: params.id },
      select: { notes: true },
    });
    const baseNotes = typeof data.notes === "string"
      ? data.notes
      : typeof body.notes === "string"
        ? body.notes
        : current?.notes ?? "";
    const dispatchDate = typeof body.orderSentDispatchDate === "string" ? body.orderSentDispatchDate : "";
    const dispatchMethod = typeof body.orderSentDispatchMethod === "string" ? body.orderSentDispatchMethod : "";
    const sentBy = typeof body.orderSentSentBy === "string" ? body.orderSentSentBy : "";
    const trackingDetails = typeof body.orderSentTrackingDetails === "string" ? body.orderSentTrackingDetails : "";
    const invoiceName = typeof body.orderSentInvoiceName === "string" ? body.orderSentInvoiceName : "";
    if (body.stage === "OrderSent" && dispatchDate && dispatchMethod && sentBy) {
      data.notes = writeOrderSentDetails(baseNotes, {
        dispatchDate,
        dispatchMethod,
        sentBy,
        trackingDetails,
        invoiceName,
      });
    }
  }
  if ("expectedCloseAt" in body)
    data.expectedCloseAt = body.expectedCloseAt ? new Date(body.expectedCloseAt) : null;
  if ("nextActionAt" in body)
    data.nextActionAt = body.nextActionAt ? new Date(body.nextActionAt) : null;
  if ("lastContactedAt" in body)
    data.lastContactedAt = body.lastContactedAt ? new Date(body.lastContactedAt) : null;
  if ("ownerRequestAt" in body)
    data.ownerRequestAt = body.ownerRequestAt ? new Date(body.ownerRequestAt) : null;
  if ("paymentDueAt" in body)
    data.paymentDueAt = body.paymentDueAt ? new Date(body.paymentDueAt) : null;
  if ("paymentReceivedAt" in body)
    data.paymentReceivedAt = body.paymentReceivedAt ? new Date(body.paymentReceivedAt) : null;
  if ("lastPaymentReminderAt" in body)
    data.lastPaymentReminderAt = body.lastPaymentReminderAt
      ? new Date(body.lastPaymentReminderAt)
      : null;
  if (body.stage === "OrderSent") {
    const current = await prisma.inquiry.findUnique({
      where: { id: params.id },
      select: { notes: true, paymentStatus: true },
    });
    const nextPaymentStatus =
      typeof body.paymentStatus === "string" ? body.paymentStatus : current?.paymentStatus;
    if (readOrderDetails(current?.notes).advancePaymentRequired && nextPaymentStatus !== "Received") {
      return NextResponse.json(
        { error: "Advance payment required for this order before it can be marked as order sent." },
        { status: 400 },
      );
    }
  }
  if ("isArchived" in body) {
    data.isArchived = Boolean(body.isArchived);
    data.deletedAt = body.isArchived ? new Date() : null;
    data.deletedBy = body.isArchived ? session.name : null;
  }

  const inquiry = await prisma.inquiry.update({ where: { id: params.id }, data });
  return NextResponse.json(inquiry);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureInquiryArchiveColumns();
  const session = getMutationSession();
  if (!session) {
    return NextResponse.json(
      { error: "Only Sales Reps and Owners can delete inquiries." },
      { status: 403 },
    );
  }

  const permanent = req.nextUrl.searchParams.get("permanent") === "true";
  if (permanent) {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      select: { id: true, isArchived: true },
    });
    if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!inquiry.isArchived) {
      return NextResponse.json(
        { error: "Archive the inquiry before deleting it permanently." },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.indiaMartLead.updateMany({
        where: { importedInquiryId: params.id },
        data: {
          importedInquiryId: null,
          importedAt: null,
          status: "New",
        },
      }),
      prisma.inquiry.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ ok: true, deletedCount: 1 });
  }

  const [result] = await prisma.$transaction([
    prisma.inquiry.updateMany({
      where: { id: { in: [params.id] }, isArchived: false },
      data: {
        isArchived: true,
        deletedAt: new Date(),
        deletedBy: session.name,
      },
    }),
  ]);

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, archivedCount: result.count });
}
