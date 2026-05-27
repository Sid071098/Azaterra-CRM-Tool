export type OwnerProfile = { id: string; name: string };

export const OWNER_PROFILES: OwnerProfile[] = [
  { id: "kailas-patel", name: "Kailas Patel" },
  { id: "karan-patil", name: "Karan Patil" },
  { id: "siddharth-patel", name: "Siddharth Patel" },
];

export function findOwner(ownerId: string | null | undefined): OwnerProfile | null {
  if (!ownerId) return null;
  return OWNER_PROFILES.find((o) => o.id === ownerId) ?? null;
}
