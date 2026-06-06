import { NextRequest, NextResponse } from "next/server";
import { fallbackDistricts } from "@/lib/indiaLocations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateId = searchParams.get("state_id");
  const stateName = searchParams.get("state_name");
  return NextResponse.json({
    data: {
      districts: fallbackDistricts(stateId, stateName),
      source: "local",
    },
  });
}
