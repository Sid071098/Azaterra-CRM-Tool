import { NextResponse } from "next/server";
import { fallbackStates, type IndiaState } from "@/lib/indiaLocations";

export const dynamic = "force-dynamic";

const INDIA_LOCATION_API = "https://india-location-hub.in/api";

export async function GET() {
  const states = await fetchRemoteStates();
  return NextResponse.json({
    data: {
      states: states.length ? states : fallbackStates,
      source: states.length ? "remote" : "fallback",
    },
  });
}

async function fetchRemoteStates(): Promise<IndiaState[]> {
  try {
    const res = await fetch(`${INDIA_LOCATION_API}/locations/states`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const states = Array.isArray(data?.data?.states) ? data.data.states : [];
    return states
      .map((item: Record<string, unknown>) => ({
        id: Number(item.id),
        name: String(item.name ?? ""),
        code: typeof item.code === "string" ? item.code : undefined,
      }))
      .filter((item: IndiaState) => Number.isFinite(item.id) && item.name);
  } catch {
    return [];
  }
}
