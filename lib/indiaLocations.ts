export type IndiaState = { id: number; name: string; code?: string };
export type IndiaDistrict = { id: number; name: string; state_id: number; state_name: string };
export type IndiaTaluka = { id: number; name: string; district_id: number; district_name: string };

type FallbackState = {
  id: number;
  name: string;
  districts: Array<{
    id: number;
    name: string;
    cities: Array<{ id: number; name: string }>;
  }>;
};

const FALLBACK: FallbackState[] = [
  {
    id: 1,
    name: "Andhra Pradesh",
    districts: [
      { id: 101, name: "Visakhapatnam", cities: [{ id: 10101, name: "Visakhapatnam" }, { id: 10102, name: "Anakapalle" }] },
      { id: 102, name: "Krishna", cities: [{ id: 10201, name: "Vijayawada" }, { id: 10202, name: "Machilipatnam" }] },
    ],
  },
  {
    id: 2,
    name: "Gujarat",
    districts: [
      { id: 201, name: "Ahmedabad", cities: [{ id: 20101, name: "Ahmedabad" }, { id: 20102, name: "Dholka" }, { id: 20103, name: "Sanand" }] },
      { id: 202, name: "Rajkot", cities: [{ id: 20201, name: "Rajkot" }, { id: 20202, name: "Gondal" }, { id: 20203, name: "Jetpur" }] },
      { id: 203, name: "Surat", cities: [{ id: 20301, name: "Surat" }, { id: 20302, name: "Bardoli" }, { id: 20303, name: "Olpad" }] },
      { id: 204, name: "Vadodara", cities: [{ id: 20401, name: "Vadodara" }, { id: 20402, name: "Dabhoi" }, { id: 20403, name: "Padra" }] },
    ],
  },
  {
    id: 3,
    name: "Karnataka",
    districts: [
      { id: 301, name: "Bengaluru Urban", cities: [{ id: 30101, name: "Bengaluru" }, { id: 30102, name: "Yelahanka" }] },
      { id: 302, name: "Mysuru", cities: [{ id: 30201, name: "Mysuru" }, { id: 30202, name: "Nanjangud" }] },
    ],
  },
  {
    id: 4,
    name: "Madhya Pradesh",
    districts: [
      { id: 401, name: "Bhopal", cities: [{ id: 40101, name: "Bhopal" }, { id: 40102, name: "Berasia" }] },
      { id: 402, name: "Indore", cities: [{ id: 40201, name: "Indore" }, { id: 40202, name: "Mhow" }] },
    ],
  },
  {
    id: 5,
    name: "Maharashtra",
    districts: [
      { id: 501, name: "Mumbai Suburban", cities: [{ id: 50101, name: "Mumbai" }, { id: 50102, name: "Andheri" }, { id: 50103, name: "Borivali" }] },
      { id: 502, name: "Nagpur", cities: [{ id: 50201, name: "Nagpur" }, { id: 50202, name: "Kamptee" }] },
      { id: 503, name: "Pune", cities: [{ id: 50301, name: "Pune" }, { id: 50302, name: "Baramati" }, { id: 50303, name: "Chakan" }] },
    ],
  },
  {
    id: 6,
    name: "Rajasthan",
    districts: [
      { id: 601, name: "Jaipur", cities: [{ id: 60101, name: "Jaipur" }, { id: 60102, name: "Chomu" }, { id: 60103, name: "Kotputli" }] },
      { id: 602, name: "Jodhpur", cities: [{ id: 60201, name: "Jodhpur" }, { id: 60202, name: "Bilara" }] },
    ],
  },
  {
    id: 7,
    name: "Tamil Nadu",
    districts: [
      { id: 701, name: "Chennai", cities: [{ id: 70101, name: "Chennai" }, { id: 70102, name: "Ambattur" }] },
      { id: 702, name: "Coimbatore", cities: [{ id: 70201, name: "Coimbatore" }, { id: 70202, name: "Pollachi" }] },
    ],
  },
  {
    id: 8,
    name: "Telangana",
    districts: [
      { id: 801, name: "Hyderabad", cities: [{ id: 80101, name: "Hyderabad" }, { id: 80102, name: "Secunderabad" }] },
      { id: 802, name: "Rangareddy", cities: [{ id: 80201, name: "Shamshabad" }, { id: 80202, name: "Chevella" }] },
    ],
  },
  {
    id: 9,
    name: "Uttar Pradesh",
    districts: [
      { id: 901, name: "Lucknow", cities: [{ id: 90101, name: "Lucknow" }, { id: 90102, name: "Malihabad" }] },
      { id: 902, name: "Kanpur Nagar", cities: [{ id: 90201, name: "Kanpur" }, { id: 90202, name: "Bilhaur" }] },
    ],
  },
  {
    id: 10,
    name: "West Bengal",
    districts: [
      { id: 1001, name: "Kolkata", cities: [{ id: 100101, name: "Kolkata" }] },
      { id: 1002, name: "North 24 Parganas", cities: [{ id: 100201, name: "Barasat" }, { id: 100202, name: "Barrackpore" }] },
    ],
  },
];

export const fallbackStates: IndiaState[] = FALLBACK.map(({ id, name }) => ({ id, name }));

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

export function fallbackTalukas(districtId?: string | null, districtName?: string | null): IndiaTaluka[] {
  const district = FALLBACK.flatMap((state) => state.districts).find(
    (item) =>
      String(item.id) === String(districtId ?? "") ||
      item.name.toLowerCase() === String(districtName ?? "").toLowerCase(),
  );
  return district
    ? district.cities.map((city) => ({
        id: city.id,
        name: city.name,
        district_id: district.id,
        district_name: district.name,
      }))
    : [];
}

function findState(stateId?: string | null, stateName?: string | null) {
  return FALLBACK.find(
    (item) =>
      String(item.id) === String(stateId ?? "") ||
      item.name.toLowerCase() === String(stateName ?? "").toLowerCase(),
  );
}
