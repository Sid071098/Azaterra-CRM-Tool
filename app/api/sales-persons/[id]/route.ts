import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = readSession();
  if (session?.role !== "Owner") {
    return NextResponse.json({ error: "Only Owners can edit sales reps" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const data: Record<string, unknown> = {};
  if (typeof body.firstName === "string") data.firstName = body.firstName.trim();
  if (typeof body.lastName === "string") data.lastName = body.lastName.trim();
  if (typeof body.email === "string") data.email = body.email.trim().toLowerCase();
  if (body.status === "Active" || body.status === "Inactive") data.status = body.status;

  const person = await prisma.salesPerson.update({ where: { id: params.id }, data });
  return NextResponse.json(person);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = readSession();
  if (session?.role !== "Owner") {
    return NextResponse.json({ error: "Only Owners can remove sales reps" }, { status: 403 });
  }
  await prisma.salesPerson.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
