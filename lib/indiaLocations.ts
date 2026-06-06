import statesAndDistricts from "@/data/india-states-districts.json";
import districtCities from "@/data/india-cities.json";
import stateCities from "@/data/india-cities-state.json";

export type IndiaState = { id: number; name: string; code?: string };
export type IndiaDistrict = { id: number; name: string; state_id: number; state_name: string };
export type IndiaTaluka = { id: number; name: string; district_id: number; district_name: string };

type DistrictDataset = {
  states: Array<{
    state: string;
    districts: string[];
  }>;
};

type DistrictCity = {
  city?: string;
  district?: string;
  state?: string;
};

type StateCity = {
  id?: string;
  name?: string;
  state?: string;
};

const districtData = statesAndDistricts as DistrictDataset;
const districtCityData = districtCities as DistrictCity[];
const stateCityData = stateCities as StateCity[];

const stateRows = districtData.states.map((state, stateIndex) => ({
  id: stateIndex + 1,
  name: normalizeUnionTerritoryName(state.state),
  rawName: state.state,
  districts: state.districts.map((district, districtIndex) => ({
    id: (stateIndex + 1) * 1000 + districtIndex + 1,
    name: normalizeDistrictName(district),
    rawName: district,
  })),
}));

export const fallbackStates: IndiaState[] = stateRows.map(({ id, name }) => ({ id, name }));

export function fallbackDistricts(stateId?: string | null, stateName?: string | null): IndiaDistrict[] {
  const state = findState(stateId, stateName);
  return state
    ? state.districts.map((district) => ({
        id: district.id,
        name: district.name,
        state_id: state.id,
        state_name: state.name,
      }))
    : [];
}

export function fallbackTalukas(
  districtId?: string | null,
  districtName?: string | null,
  stateName?: string | null,
): IndiaTaluka[] {
  const district = findDistrict(districtId, districtName);
  if (!district) return [];

  const state = findState(null, stateName) ?? findStateByDistrictId(district.id);
  const names = new Set<string>();

  for (const city of districtCityData) {
    if (!city.city) continue;
    if (state && city.state && normalizeKey(city.state) !== normalizeKey(state.name)) continue;
    if (city.district && sameDistrict(city.district, district.name)) names.add(city.city.trim());
  }

  if (names.size === 0 && state) {
    for (const city of stateCityData) {
      if (city.name && city.state && normalizeKey(city.state) === normalizeKey(state.name)) {
        names.add(city.name.trim());
      }
    }
  }

  if (names.size === 0) names.add(district.name);

  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name, index) => ({
      id: district.id * 10000 + index + 1,
      name,
      district_id: district.id,
      district_name: district.name,
    }));
}

function findState(stateId?: string | null, stateName?: string | null) {
  return stateRows.find(
    (item) =>
      String(item.id) === String(stateId ?? "") ||
      normalizeKey(item.name) === normalizeKey(String(stateName ?? "")) ||
      normalizeKey(item.rawName) === normalizeKey(String(stateName ?? "")),
  );
}

function findStateByDistrictId(districtId: number) {
  return stateRows.find((state) => state.districts.some((district) => district.id === districtId));
}

function findDistrict(districtId?: string | null, districtName?: string | null) {
  for (const state of stateRows) {
    const district = state.districts.find(
      (item) =>
        String(item.id) === String(districtId ?? "") ||
        sameDistrict(item.name, String(districtName ?? "")) ||
        sameDistrict(item.rawName, String(districtName ?? "")),
    );
    if (district) return district;
  }
  return null;
}

function sameDistrict(a: string, b: string) {
  const left = normalizeDistrictKey(a);
  const right = normalizeDistrictKey(b);
  return left === right || left.includes(right) || right.includes(left);
}

function normalizeUnionTerritoryName(name: string) {
  return name.replace(/\s*\(UT\)\s*/i, "").trim();
}

function normalizeDistrictName(name: string) {
  return name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDistrictKey(value: string) {
  return normalizeKey(normalizeDistrictName(value).replace(/\b(east|west|north|south)\b/g, ""));
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
