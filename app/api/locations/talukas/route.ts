import { NextRequest, NextResponse } from "next/server";
import { fallbackTalukas, type IndiaTaluka } from "@/lib/indiaLocations";

export const dynamic = "force-dynamic";

const INDIA_LOCATION_API = "https://india-location-hub.in/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const districtId = searchParams.get("district_id");
  const districtName = searchParams.get("district_name");
  const talukas = districtId ? await fetchRemoteTalukas(districtId) : [];
  return NextResponse.json({
    data: {
      talukas: talukas.length ? talukas : fallbackTalukas(districtId, districtName),
      source: talukas.length ? "remote" : "fallback",
    },
  });
}

async function fetchRemoteTalukas(districtId: string): Promise<IndiaTaluka[]> {
  try {
    const res = await fetch(
      `${INDIA_LOCATION_API}/locations/talukas?district_id=${encodeURIComponent(districtId)}`,
      { cache: "no-store", next: { revalidate: 0 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const talukas = Array.isArray(data?.data?.talukas) ? data.data.talukas : [];
    return talukas
      .map((item: Record<string, unknown>) => ({
        id: Number(item.id),
        name: String(item.name ?? ""),
        district_id: Number(item.district_id ?? districtId),
        district_name: typeof item.district_name === "string" ? item.district_name : "",
      }))
      .filter((item: IndiaTaluka) => Number.isFinite(item.id) && item.name);
  } catch {
    return [];
  }
}
