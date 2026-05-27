import { NextResponse } from "next/server";
import { ensureInquiryArchiveColumns } from "@/lib/archiveSchema";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureInquiryArchiveColumns();
  return NextResponse.json({ ok: true });
}
