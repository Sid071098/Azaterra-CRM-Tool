import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const COLUMNS: { header: string; pick: (row: InquiryRow) => unknown }[] = [
  { header: "Created", pick: (r) => r.createdAt.toISOString() },
  { header: "Updated", pick: (r) => r.updatedAt.toISOString() },
  { header: "Company", pick: (r) => r.companyName },
  { header: "Contact", pick: (r) => r.contactName },
  { header: "Email", pick: (r) => r.email ?? "" },
  { header: "Phone", pick: (r) => r.phone ?? "" },
  { header: "Country", pick: (r) => r.country },
  { header: "City", pick: (r) => r.city ?? "" },
  { header: "Customer Type", pick: (r) => r.customerType },
  { header: "Source", pick: (r) => r.source },
  { header: "Product", pick: (r) => r.product },
  { header: "Product Notes", pick: (r) => r.productNotes ?? "" },
  { header: "Quantity", pick: (r) => r.quantity ?? "" },
  { header: "Unit", pick: (r) => r.quantityUnit ?? "" },
  { header: "Packaging", pick: (r) => r.packaging ?? "" },
  { header: "Stage", pick: (r) => r.stage },
  { header: "Archived", pick: (r) => (r.isArchived ? "Yes" : "No") },
  { header: "Archived At", pick: (r) => (r.deletedAt ? r.deletedAt.toISOString() : "") },
  { header: "Archived By", pick: (r) => r.deletedBy ?? "" },
  { header: "Sample Decision", pick: (r) => r.sampleDecision ?? "" },
  { header: "Estimated Value", pick: (r) => r.estimatedValue ?? "" },
  { header: "Currency", pick: (r) => r.currency ?? "" },
  {
    header: "Sales Rep",
    pick: (r) =>
      r.salesPerson ? `${r.salesPerson.firstName} ${r.salesPerson.lastName}` : r.assignedTo ?? "",
  },
  { header: "Next Action Date", pick: (r) => (r.nextActionAt ? r.nextActionAt.toISOString() : "") },
  { header: "Next Action Note", pick: (r) => r.nextActionNote ?? "" },
  { header: "Notes", pick: (r) => r.notes ?? "" },
  { header: "Regulatory Notes", pick: (r) => r.regulatoryNotes ?? "" },
];

type InquiryRow = Awaited<ReturnType<typeof prisma.inquiry.findMany<{
  include: { salesPerson: true };
}>>>[number];

export async function GET() {
  const session = readSession();
  if (session?.role !== "Owner") {
    return NextResponse.json(
      { error: "Only Owners can export inquiry data." },
      { status: 403 },
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await prisma.inquiry.findMany({
    where: { createdAt: { gte: since } },
    include: { salesPerson: true },
    orderBy: { createdAt: "desc" },
  });

  // BOM keeps Excel happy with UTF-8 characters in company / contact names.
  const csv =
    "﻿" +
    [
      COLUMNS.map((c) => csvCell(c.header)).join(","),
      ...rows.map((r) => COLUMNS.map((c) => csvCell(c.pick(r))).join(",")),
    ].join("\r\n");

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="azaterra-inquiries-last-30-days-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
