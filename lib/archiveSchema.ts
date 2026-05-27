import { prisma } from "@/lib/db";

let archiveSchemaReady: Promise<void> | null = null;

export function ensureInquiryArchiveColumns() {
  archiveSchemaReady ??= prisma.$executeRawUnsafe(`
    ALTER TABLE "Inquiry"
      ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "deletedBy" TEXT
  `).then(() => undefined);

  return archiveSchemaReady;
}
