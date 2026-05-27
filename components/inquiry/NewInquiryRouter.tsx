"use client";

import type { SessionUser, UserRole } from "@/lib/auth";
import RepInquiryWizard from "./RepInquiryWizard";

export type TeamLite = { id: string; firstName: string; lastName: string };

export default function NewInquiryRouter({
  supabaseConfigured,
  sessionUser,
  appRole,
  appName,
  appSalesPersonId,
  team,
}: {
  supabaseConfigured: boolean;
  sessionUser: SessionUser;
  appRole?: UserRole;
  appName?: string | null;
  appSalesPersonId?: string | null;
  team?: TeamLite[];
}) {
  // Real auth: Supabase configured + user logged in → use their role.
  if (supabaseConfigured && sessionUser) {
    return (
      <RepInquiryWizard
        currentUser={sessionUser}
        team={team ?? []}
        isOwner={sessionUser.role === "Owner"}
      />
    );
  }

  // App-session login (cookie role chosen at /login).
  if (appRole) {
    const synthetic: SessionUser = {
      id: appSalesPersonId ?? "app-session",
      email: null,
      fullName: appName ?? appRole,
      role: appRole,
    };
    return (
      <RepInquiryWizard
        currentUser={synthetic}
        team={team ?? []}
        isOwner={appRole === "Owner"}
      />
    );
  }

  // Real auth configured but no session and no app session → ask to log in.
  if (supabaseConfigured && !sessionUser) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        <h2 className="mb-2 text-base font-semibold">Sign-in required</h2>
        <p>
          You are not logged in. Visit <code className="rounded bg-white/60 px-1">/login</code> to
          authenticate, then come back to capture inquiries.
        </p>
      </div>
    );
  }

  // No auth configured at all → fall back to the wizard in unassigned mode.
  return <RepInquiryWizard currentUser={null} team={team ?? []} isOwner={false} />;
}
