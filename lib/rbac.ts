import { readSession, type AppRole } from "@/lib/session";

const MUTATION_ROLES = new Set<AppRole>(["Owner", "SalesRep"]);

export function getMutationSession() {
  const session = readSession();
  if (!session || !MUTATION_ROLES.has(session.role)) return null;
  return session;
}
