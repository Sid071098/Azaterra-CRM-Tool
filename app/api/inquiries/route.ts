import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getMutationSession } from "@/lib/rbac";
import { getPrimarySalesPersonId } from "@/lib/primaryRep";
import { ensureInquiryArchiveColumns } from "@/lib/archiveSchema";

export async function GET(req: NextRequest) {
  await ensureInquiryArchiveColumns();
  if (!readSession()) {
    return NextResponse.json({ error: "Sign in to view inquiries." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage") ?? undefined;
  const product = searchParams.get("product") ?? undefined;
  const country = searchParams.get("country") ?? undefined;
  const search = searchParams.get("q") ?? undefined;
  const salesPersonId = searchParams.get("salesPersonId") ?? undefined;
  const archive = searchParams.get("archive") ?? "active";

  const where: Record<string, unknown> = {};
  if (archive === "only") where.isArchived = true;
  else if (archive !== "all") where.isArchived = false;
  if (stage) where.stage = stage;
  if (product) where.product = product;
  if (country) where.country = country;
  if (salesPersonId) where.salesPersonId = salesPersonId;
  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { contactName: { contains: search } },
      { email: { contains: search } },
      { country: { contains: search } },
    ];
  }

  const inquiries = await prisma.inquiry.findMany({
    where,
    include: { salesPerson: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(inquiries);
}

export async function POST(req: NextRequest) {
  if (!getMutationSession()) {
    return NextResponse.json(
      { error: "Only signed-in Sales Reps or Owners can create inquiries." },
      { status: 403 },
    );
  }
  const body = await req.json();
  if (!body.companyName || !body.contactName || !body.country || !body.product) {
    return NextResponse.json(
      { error: "companyName, contactName, country and product are required" },
      { status: 400 },
    );
  }
  const salesPersonId =
    body.salesPersonId || (body.assignedTo ? null : await getPrimarySalesPersonId());
  const inquiry = await prisma.inquiry.create({
    data: {
      companyName: body.companyName,
      contactName: body.contactName,
      email: body.email || null,
      phone: body.phone || null,
      country: body.country,
      city: body.city || null,
      customerType: body.customerType || "Other",
      source: body.source || "Other",
      product: body.product,
      productNotes: body.productNotes || null,
      quantity: body.quantity ? Number(body.quantity) : null,
      quantityUnit: body.quantityUnit || null,
      packaging: body.packaging || null,
      stage: body.stage || "New",
      sampleDecision: body.sampleDecision || null,
      expectedCloseAt: body.expectedCloseAt ? new Date(body.expectedCloseAt) : null,
      estimatedValue: body.estimatedValue ? Number(body.estimatedValue) : null,
      currency: body.currency || "USD",
      assignedTo: body.assignedTo || null,
      salesPersonId,
      nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null,
      nextActionNote: body.nextActionNote || null,
      notes: body.notes || null,
      regulatoryNotes: body.regulatoryNotes || null,
    },
  });
  return NextResponse.json(inquiry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await ensureInquiryArchiveColumns();
  const session = getMutationSession();
  if (!session) {
    return NextResponse.json(
      { error: "Only Sales Reps and Owners can delete inquiries." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawInquiryIds = body.inquiryIds;
  const inquiryIds: string[] = Array.isArray(rawInquiryIds)
    ? rawInquiryIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (inquiryIds.length === 0) {
    return NextResponse.json({ error: "inquiryIds must include at least one ID." }, { status: 400 });
  }

  const uniqueIds: string[] = Array.from(new Set(inquiryIds));
  const [result] = await prisma.$transaction([
    prisma.inquiry.updateMany({
      where: { id: { in: uniqueIds }, isArchived: false },
      data: {
        isArchived: true,
        deletedAt: new Date(),
        deletedBy: session.name,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, archivedCount: result.count });
}
