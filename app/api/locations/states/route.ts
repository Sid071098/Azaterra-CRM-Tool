import { NextResponse } from "next/server";
import { fallbackStates } from "@/lib/indiaLocations";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: {
      states: fallbackStates,
      source: "local",
    },
  });
}
