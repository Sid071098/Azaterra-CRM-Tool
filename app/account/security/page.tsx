import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { readSession } from "@/lib/session";
import ChangePinForm from "./ChangePinForm";

export const dynamic = "force-dynamic";

export default function SecurityPage() {
  const session = readSession();
  if (!session) redirect("/login?next=/account/security");
  if (session.role !== "Owner") redirect("/");

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-200/60">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-brand-900">
              Change owner PIN
            </h1>
            <p className="text-xs text-muted">
              Signed in as <span className="font-medium text-brand-900">{session.name}</span>
            </p>
          </div>
        </div>
        <div className="mt-6">
          <ChangePinForm />
        </div>
      </div>
    </div>
  );
}
