// Offline draft storage for rural/low-connectivity submission.
// If a Supabase insert fails (network), we stash the payload in localStorage
// keyed by timestamp. On next successful load we attempt to flush them.

import type { InquiryInsert } from "./inquiryOptions";

const KEY = "azaterra.inquiry.drafts.v1";

export type Draft = { id: string; savedAt: string; payload: InquiryInsert };

function read(): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Draft[];
  } catch {
    return [];
  }
}

function write(drafts: Draft[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(drafts));
}

export function saveDraft(payload: InquiryInsert) {
  const drafts = read();
  drafts.push({
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    payload,
  });
  write(drafts);
}

export function listDrafts(): Draft[] {
  return read();
}

export function removeDraft(id: string) {
  write(read().filter((d) => d.id !== id));
}

export function clearDrafts() {
  write([]);
}
