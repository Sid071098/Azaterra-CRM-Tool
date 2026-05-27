"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, MailPlus, RefreshCw } from "lucide-react";

type InquiryEmailContext = {
  id: string;
  companyName: string;
  contactName: string;
  email: string | null;
  product: string;
  stage?: string;
  orderStatus?: string;
  invoiceName?: string;
};

type Draft = {
  subject: string;
  body: string;
};

export default function EmailDraftPage({
  inquiry,
  fromEmail,
  fromName,
  senderRoleLabel = "Sales rep",
  gmailConnected,
}: {
  inquiry: InquiryEmailContext;
  fromEmail: string | null;
  fromName: string;
  senderRoleLabel?: string;
  gmailConnected: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({ subject: "", body: "" });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [invoiceAttachment, setInvoiceAttachment] = useState<{
    filename: string;
    contentType: string;
    base64: string;
  } | null>(null);
  const shouldAttachInvoice = inquiry.stage === "OrderStatus" && inquiry.orderStatus === "Order ready";

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: inquiry.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not generate email.");
      setDraft({ subject: data.subject ?? "", body: data.body ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate email.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiry.id]);

  const mailto = `mailto:${inquiry.email ?? ""}?subject=${encodeURIComponent(
    draft.subject,
  )}&body=${encodeURIComponent(draft.body)}`;

  async function sendEmail() {
    setSending(true);
    setError(null);
    setSentMessage(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: inquiry.id,
          subject: draft.subject,
          body: draft.body,
          attachments: invoiceAttachment ? [invoiceAttachment] : [],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not send email.");
      setSentMessage("Email sent through Gmail.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/inquiries/${inquiry.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to inquiry
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-brand-900">Send email</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review the full message for {inquiry.companyName} before sending.
        </p>
      </div>

      <section className="card-soft mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="From email">
            <input
              className="input"
              value={fromEmail ?? ""}
              placeholder="No sales rep email found"
              readOnly
            />
            <p className="mt-1 text-xs text-slate-500">
              {senderRoleLabel}: <span className="font-medium">{fromName}</span>
            </p>
            {fromEmail ? (
              <p className="mt-1 text-xs text-slate-500">
                The email client should send from this same account.
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-700">
                Connect Gmail to send follow-up emails from this account.
              </p>
            )}
            {!gmailConnected ? (
              <a
                className="mt-2 inline-flex rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100"
                href="/api/email/google/connect"
              >
                Connect Gmail
              </a>
            ) : (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Gmail connected
              </p>
            )}
          </Field>
          <Field label="To">
            <input className="input" value={inquiry.email ?? ""} readOnly />
            {!inquiry.email ? (
              <p className="mt-1 text-xs text-rose-600">
                Add a customer email on the inquiry before sending.
              </p>
            ) : null}
          </Field>
        </div>
      </section>

      <section className="card-soft">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-20 text-center text-sm text-slate-600">
            Researching the customer and preparing the email…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Subject">
              <input
                className="input"
                value={draft.subject}
                onChange={(e) => setDraft((cur) => ({ ...cur, subject: e.target.value }))}
              />
            </Field>
            <Field label="Body">
              <textarea
                className="textarea h-[72vh] min-h-[560px] resize-y text-base leading-7"
                style={{ minHeight: "560px" }}
                value={draft.body}
                onChange={(e) => setDraft((cur) => ({ ...cur, body: e.target.value }))}
              />
            </Field>
            {shouldAttachInvoice ? (
              <Field label="Invoice attachment">
                <input
                  className="input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      setInvoiceAttachment(null);
                      return;
                    }
                    const base64 = await fileToBase64(file);
                    setInvoiceAttachment({
                      filename: file.name,
                      contentType: file.type || "application/octet-stream",
                      base64,
                    });
                  }}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {invoiceAttachment
                    ? `Attached: ${invoiceAttachment.filename}`
                    : inquiry.invoiceName
                      ? `Optional: select ${inquiry.invoiceName} to attach it.`
                      : "Optional: attach an invoice if needed."}
                </p>
              </Field>
            ) : null}
          </div>
        )}

        {sentMessage ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {sentMessage}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-1"
            onClick={generate}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </button>
          <a
            className="btn-ghost inline-flex items-center gap-1 aria-disabled:pointer-events-none aria-disabled:opacity-50"
            href={mailto}
            aria-disabled={!draft.subject || !draft.body || !inquiry.email}
          >
            <MailPlus className="h-4 w-4" />
            Open email client
          </a>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1 disabled:opacity-50"
            disabled={
              loading ||
              sending ||
              !draft.subject ||
              !draft.body ||
              !inquiry.email ||
              !gmailConnected
            }
            onClick={sendEmail}
          >
            <MailPlus className="h-4 w-4" />
            {sending ? "Sending…" : "Send through Gmail"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
