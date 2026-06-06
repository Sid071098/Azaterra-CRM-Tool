"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function ArchivedDeleteAllButton({ count }: { count: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function deleteAll() {
    if (count === 0 || deleting) return;
    if (!confirm(`Permanently delete all ${count} archived leads? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAllArchived: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not delete archived leads.");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete archived leads.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={count === 0 || deleting}
      onClick={deleteAll}
    >
      <Trash2 className="h-4 w-4" />
      {deleting ? "Deleting..." : "Delete All"}
    </button>
  );
}
