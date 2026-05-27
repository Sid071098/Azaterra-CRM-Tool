import { NextRequest, NextResponse } from "next/server";
import { fallbackDistricts, type IndiaDistrict } from "@/lib/indiaLocations";

export const dynamic = "force-dynamic";

const INDIA_LOCATION_API = "https://india-location-hub.in/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateId = searchParams.get("state_id");
  const stateName = searchParams.get("state_name");
  const districts = stateId ? await fetchRemoteDistricts(stateId) : [];
  return NextResponse.json({
    data: {
      districts: districts.length ? districts : fallbackDistricts(stateId, stateName),
      source: districts.length ? "remote" : "fallback",
    },
  });
}

async function fetchRemoteDistricts(stateId: string): Promise<IndiaDistrict[]> {
  try {
    const res = await fetch(
      `${INDIA_LOCATION_API}/locations/districts?state_id=${encodeURIComponent(stateId)}`,
      { cache: "no-store", next: { revalidate: 0 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const districts = Array.isArray(data?.data?.districts) ? data.data.districts : [];
    return districts
      .map((item: Record<string, unknown>) => ({
        id: Number(item.id),
        name: String(item.name ?? ""),
        state_id: Number(item.state_id ?? stateId),
        state_name: typeof item.state_name === "string" ? item.state_name : "",
      }))
      .filter((item: IndiaDistrict) => Number.isFinite(item.id) && item.name);
  } catch {
    return [];
  }
}
