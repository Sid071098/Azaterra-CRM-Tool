import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { fetchIndiaMartLeads, normalizeLead, sampleLeads } from "@/lib/indiamart";

const DEFAULT_LOOKBACK_DAYS = 7;

export async function POST(req: Request) {
  const session = readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    lookbackDays?: number;
    useSample?: boolean;
  };

  const lookbackDays =
    typeof body?.lookbackDays === "number" && body.lookbackDays > 0
      ? Math.min(body.lookbackDays, 30)
      : DEFAULT_LOOKBACK_DAYS;

  const apiKey = process.env.INDIAMART_API_KEY?.trim();
  const useSample = Boolean(body?.useSample);

  let raw: ReturnType<typeof sampleLeads> = [];

  if (useSample) {
    raw = sampleLeads();
  } else {
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "INDIAMART_API_KEY is not set. Add it to .env (or use Load demo data to preview the UI).",
        },
        { status: 400 },
      );
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - lookbackDays);
    try {
      const data = await fetchIndiaMartLeads({ apiKey, start, end });
      if (!data?.RESPONSE) {
        return NextResponse.json(
          { error: data?.MESSAGE || "IndiaMART returned no RESPONSE field" },
          { status: 502 },
        );
      }
      raw = data.RESPONSE;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "IndiaMART fetch failed" },
        { status: 502 },
      );
    }
  }

  let inserted = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (const r of raw) {
    const norm = normalizeLead(r);
    if (!norm) {
      skipped.push(JSON.stringify(r).slice(0, 80));
      continue;
    }
    const existing = await prisma.indiaMartLead.findUnique({
      where: { uniqueQueryId: norm.uniqueQueryId },
    });
    if (existing) {
      await prisma.indiaMartLead.update({
        where: { uniqueQueryId: norm.uniqueQueryId },
        data: { ...norm, fetchedAt: new Date() },
      });
      updated++;
    } else {
      await prisma.indiaMartLead.create({ data: norm });
      inserted++;
    }
  }

  return NextResponse.json({
    ok: true,
    inserted,
    updated,
    skippedCount: skipped.length,
    usedSample: useSample,
    lookbackDays: useSample ? null : lookbackDays,
  });
}
