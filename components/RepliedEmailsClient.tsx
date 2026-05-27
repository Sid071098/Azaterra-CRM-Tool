"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";

type ReplyItem = {
  id: string;
  fromName: string | null;
  fromEmail: string;
  snippet: string | null;
  receivedAt: string | Date;
  gmailThreadId: string;
  inquiry: {
    id: string;
    companyName: string;
    contactName: string;
    email: string | null;
  };
};

export default function RepliedEmailsClient({ replies }: { replies: ReplyItem[] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/email/sync-replies", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not sync replies.");
      setMessage(`Checked ${data.checkedThreads ?? 0} threads. Found ${data.repliesFound ?? 0} unread replies.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not sync replies.");
    } finally {
      setSyncing(false);
    }
  }

  async function markHandled(id: string) {
    await fetch(`/api/email/replies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHandled: true }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">Replied Emails</h1>
          <p className="mt-1 text-sm text-slate-600">
            Unread customer replies detected from Gmail threads sent through CRM.
          </p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2" onClick={sync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Checking..." : "Check Gmail"}
        </button>
      </div>

      {message ? (
        <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900">
          {message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {replies.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-brand-950">No unread customer replies yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              Click Check Gmail after connecting Gmail to pull the latest replies.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {replies.map((reply) => (
              <div key={reply.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/inquiries/${reply.inquiry.id}`}
                      className="font-semibold text-brand-800 hover:underline"
                    >
                      {reply.inquiry.companyName}
                    </Link>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {timeAgo(new Date(reply.receivedAt))}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {reply.fromName || reply.inquiry.contactName} &lt;{reply.fromEmail}&gt;
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                    {reply.snippet || "Unread reply received from this customer."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <a
                    className="btn-ghost inline-flex items-center gap-1"
                    href={`https://mail.google.com/mail/u/0/#inbox/${reply.gmailThreadId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Gmail
                  </a>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                    onClick={() => markHandled(reply.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark handled
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(date: Date) {
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}
