import { NextRequest, NextResponse } from "next/server";
import { fallbackTalukas } from "@/lib/indiaLocations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const districtId = searchParams.get("district_id");
  const districtName = searchParams.get("district_name");
  const stateName = searchParams.get("state_name");
  return NextResponse.json({
    data: {
      talukas: fallbackTalukas(districtId, districtName, stateName),
      source: "local",
    },
  });
}
