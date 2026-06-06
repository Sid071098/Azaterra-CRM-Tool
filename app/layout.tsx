import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutGrid,
  List,
  PlusCircle,
  Users,
  ShieldCheck,
  UserCircle2,
  KeyRound,
  Inbox,
  BarChart3,
  Archive,
  MailCheck,
} from "lucide-react";
import { readSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "Azaterra CRM",
  description: "Sales inquiry tracker for Azaterra Crop Science",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = readSession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f4f6f2] text-ink antialiased">
        {session ? (
          <div className="flex min-h-screen">
            <Sidebar role={session.role} />
            <div className="flex flex-1 flex-col">
              <header className="glass-header sticky top-0 z-30">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-700">
                      Azaterra Crop Science
                    </div>
                    <div className="font-display text-base font-semibold text-brand-900">
                      {session.role === "Owner" ? "Operations dashboard" : "Sales workspace"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href="/inquiries/new" className="btn-primary">
                      <PlusCircle className="mr-2 h-4 w-4" /> New Inquiry
                    </Link>
                    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-1.5">
                      <Avatar name={session.name} role={session.role} />
                      <div className="leading-tight">
                        <div className="text-sm font-semibold text-brand-900">
                          {session.name}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-muted">
                          {session.role === "Owner" ? "Owner" : "Sales Rep"}
                        </div>
                      </div>
                      <LogoutButton />
                    </div>
                  </div>
                </div>
              </header>
              <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
                {children}
              </main>
            </div>
          </div>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}

function Sidebar({ role }: { role: "Owner" | "SalesRep" }) {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-3 px-6 py-5">
        <img
          src="/azaterra-logo.png"
          alt="Azaterra Crop Science"
          className="h-10 w-10 rounded-md ring-1 ring-brand-200/60"
        />
        <div>
          <div className="font-display text-sm font-semibold text-brand-900">
            Azaterra CRM
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted">
            Crop Science
          </div>
        </div>
      </Link>
      <nav className="mt-2 flex flex-col gap-0.5 px-3">
        <NavLink href="/" icon={<LayoutGrid className="h-4 w-4" />} label="Manual Inquiry" />
        <NavLink
          href="/indiamart"
          icon={<Inbox className="h-4 w-4" />}
          label="IndiaMART Inquiry"
        />
        <NavLink href="/inquiries" icon={<List className="h-4 w-4" />} label="All Inquiries" />
        <NavLink
          href="/inquiries/new"
          icon={<PlusCircle className="h-4 w-4" />}
          label="New Inquiry"
        />
        <NavLink href="/analysis" icon={<BarChart3 className="h-4 w-4" />} label="Analysis" />
        <NavLink href="/email-replies" icon={<MailCheck className="h-4 w-4" />} label="Replied Email" />
        {role === "Owner" ? (
          <>
            <NavLink
              href="/team"
              icon={<Users className="h-4 w-4" />}
              label="Manage Sales Team"
            />
            <NavLink href="/inquiries/archived" icon={<Archive className="h-4 w-4" />} label="Archived Leads" />
            <NavLink
              href="/account/security"
              icon={<KeyRound className="h-4 w-4" />}
              label="Change PIN"
            />
          </>
        ) : null}
      </nav>
      <div className="mt-auto px-6 pb-5 pt-4 text-[10px] uppercase tracking-[0.22em] text-muted">
        {role === "Owner" ? (
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Owner workspace
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <UserCircle2 className="h-3 w-3" /> Sales workspace
          </span>
        )}
      </div>
    </aside>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-brand-900/85 transition hover:bg-brand-50 hover:text-brand-700"
    >
      <span className="text-brand-700">{icon}</span>
      {label}
    </Link>
  );
}

function Avatar({ name, role }: { name: string; role: "Owner" | "SalesRep" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
        role === "Owner"
          ? "bg-brand-900 text-white"
          : "bg-brand-50 text-brand-700 ring-1 ring-brand-200/60"
      }`}
    >
      {initials || "?"}
    </span>
  );
}
