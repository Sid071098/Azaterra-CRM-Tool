import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, serializeSession, type AppRole } from "@/lib/session";
import { findOwner } from "@/lib/owners";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const role = body?.role as AppRole | undefined;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const salesPersonId =
    typeof body?.salesPersonId === "string" && body.salesPersonId.length > 0
      ? body.salesPersonId
      : null;
  const ownerId =
    typeof body?.ownerId === "string" && body.ownerId.length > 0 ? body.ownerId : null;
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const confirmPin = typeof body?.confirmPin === "string" ? body.confirmPin : "";

  if (role !== "Owner" && role !== "SalesRep") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  let resolvedName = name;
  let resolvedSalesPersonId: string | null = null;
  let resolvedOwnerId: string | null = null;

  if (role === "SalesRep") {
    if (!salesPersonId) {
      return NextResponse.json(
        { error: "Pick your name from the sales team to continue" },
        { status: 400 },
      );
    }
    const person = await prisma.salesPerson.findUnique({ where: { id: salesPersonId } });
    if (!person || person.status !== "Active") {
      return NextResponse.json(
        { error: "That sales rep is not active. Ask the owner to enable you." },
        { status: 403 },
      );
    }
    resolvedSalesPersonId = person.id;
    resolvedName = `${person.firstName} ${person.lastName}`.trim();
  }

  if (role === "Owner") {
    const owner = findOwner(ownerId);
    if (!owner) {
      return NextResponse.json({ error: "Pick an owner profile to continue" }, { status: 400 });
    }
    if (!isValidPin(pin)) {
      return NextResponse.json({ error: "Enter a 4-digit PIN" }, { status: 400 });
    }

    const existing = await prisma.ownerPin.findUnique({ where: { ownerId: owner.id } });

    if (!existing) {
      if (!isValidPin(confirmPin)) {
        return NextResponse.json(
          { error: "Confirm the 4-digit PIN to set it up" },
          { status: 400 },
        );
      }
      if (pin !== confirmPin) {
        return NextResponse.json({ error: "PINs don't match" }, { status: 400 });
      }
      const { hash, salt } = hashPin(pin);
      await prisma.ownerPin.create({
        data: { ownerId: owner.id, pinHash: hash, pinSalt: salt },
      });
    } else {
      const ok = verifyPin(pin, existing.pinHash, existing.pinSalt);
      if (!ok) {
        return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
      }
    }

    resolvedOwnerId = owner.id;
    resolvedName = owner.name;
  }

  const res = NextResponse.json({
    ok: true,
    role,
    name: resolvedName || role,
    salesPersonId: resolvedSalesPersonId,
    ownerId: resolvedOwnerId,
  });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: serializeSession({
      role,
      name: resolvedName || role,
      salesPersonId: resolvedSalesPersonId,
      ownerId: resolvedOwnerId,
    }),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return res;
}
