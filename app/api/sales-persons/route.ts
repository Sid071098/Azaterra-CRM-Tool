import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  if (!readSession()) {
    return NextResponse.json({ error: "Sign in to view the sales team." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where = status ? { status } : {};
  const people = await prisma.salesPerson.findMany({
    where,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return NextResponse.json(people);
}

export async function POST(req: NextRequest) {
  const session = readSession();
  if (session?.role !== "Owner") {
    return NextResponse.json({ error: "Only Owners can add sales reps" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const status =
    body.status === "Inactive" ? "Inactive" : "Active";

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: "firstName, lastName and email are required" },
      { status: 400 },
    );
  }

  const existing = await prisma.salesPerson.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A sales rep with that email already exists" }, { status: 409 });
  }

  const person = await prisma.salesPerson.create({
    data: { firstName, lastName, email, status },
  });
  return NextResponse.json(person, { status: 201 });
}
