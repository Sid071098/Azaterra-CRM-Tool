import { getSupabaseServer } from "./supabase/server";

export type UserRole = "Owner" | "SalesRep";

export type SessionUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
} | null;

/**
 * Server-side current user resolver.
 * Returns null if Supabase is not configured OR no one is logged in.
 * Callers should fall back to "demo role" UI when this returns null.
 */
export async function getSessionUser(): Promise<SessionUser> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: (profile?.role as UserRole) ?? "SalesRep",
  };
}
