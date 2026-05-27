import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncUnreadRepliesForAccount } from "@/lib/emailReplySync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [salesReps, ownerRows] = await Promise.all([
    prisma.salesPerson.findMany({
      where: {
        googleEmail: { not: null },
        googleRefreshToken: { not: null },
      },
      select: {
        id: true,
        googleEmail: true,
        googleRefreshToken: true,
      },
    }),
    prisma.ownerPin.findMany({
      where: { ownerId: { startsWith: "gmail:" } },
      select: { ownerId: true, pinHash: true, pinSalt: true },
    }),
  ]);

  const accounts = [
    ...salesReps.map((rep) => ({
      email: rep.googleEmail!,
      refreshToken: rep.googleRefreshToken!,
      salesPersonId: rep.id,
      ownerId: null,
    })),
    ...ownerRows.map((row) => ({
      email: row.pinHash,
      refreshToken: row.pinSalt,
      salesPersonId: null,
      ownerId: row.ownerId.replace(/^gmail:/, ""),
    })),
  ];

  const results = [];
  for (const account of accounts) {
    try {
      results.push({
        email: account.email,
        ...(await syncUnreadRepliesForAccount(account)),
      });
    } catch (err) {
      results.push({
        email: account.email,
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  return NextResponse.json({ ok: true, accounts: results.length, results });
}
