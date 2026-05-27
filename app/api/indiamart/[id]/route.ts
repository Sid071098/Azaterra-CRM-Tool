import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  if (body?.status !== "New" && body?.status !== "Imported" && body?.status !== "Ignored") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const lead = await prisma.indiaMartLead.update({
    where: { id: params.id },
    data: { status: body.status },
  });
  return NextResponse.json({ ok: true, lead });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.indiaMartLead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
