import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";

export async function PUT(req: Request) {
  const session = readSession();
  if (!session || session.role !== "Owner" || !session.ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const currentPin = typeof body?.currentPin === "string" ? body.currentPin : "";
  const newPin = typeof body?.newPin === "string" ? body.newPin : "";
  const confirmPin = typeof body?.confirmPin === "string" ? body.confirmPin : "";

  if (!isValidPin(currentPin) || !isValidPin(newPin) || !isValidPin(confirmPin)) {
    return NextResponse.json({ error: "All PINs must be 4 digits" }, { status: 400 });
  }
  if (newPin !== confirmPin) {
    return NextResponse.json({ error: "New PINs don't match" }, { status: 400 });
  }
  if (newPin === currentPin) {
    return NextResponse.json(
      { error: "New PIN must be different from your current PIN" },
      { status: 400 },
    );
  }

  const existing = await prisma.ownerPin.findUnique({ where: { ownerId: session.ownerId } });
  if (!existing) {
    return NextResponse.json({ error: "No PIN on file. Sign out and set one." }, { status: 404 });
  }
  if (!verifyPin(currentPin, existing.pinHash, existing.pinSalt)) {
    return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
  }

  const { hash, salt } = hashPin(newPin);
  await prisma.ownerPin.update({
    where: { ownerId: session.ownerId },
    data: { pinHash: hash, pinSalt: salt },
  });

  return NextResponse.json({ ok: true });
}
