import { prisma } from "@/lib/db";

let emailReplySchemaReady: Promise<void> | null = null;

export function ensureEmailReplyTables() {
  emailReplySchemaReady ??= prisma.$transaction([
    prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SentEmail" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "inquiryId" TEXT NOT NULL,
        "salesPersonId" TEXT,
        "ownerId" TEXT,
        "actorRole" TEXT NOT NULL,
        "fromEmail" TEXT NOT NULL,
        "toEmail" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "gmailMessageId" TEXT NOT NULL,
        "gmailThreadId" TEXT NOT NULL,
        "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastSyncedAt" TIMESTAMP(3),
        CONSTRAINT "SentEmail_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "SentEmail_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "SalesPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `),
    prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "SentEmail_gmailMessageId_key"
      ON "SentEmail"("gmailMessageId")
    `),
    prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SentEmail_gmailThreadId_idx"
      ON "SentEmail"("gmailThreadId")
    `),
    prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EmailReply" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "inquiryId" TEXT NOT NULL,
        "sentEmailId" TEXT NOT NULL,
        "gmailMessageId" TEXT NOT NULL,
        "gmailThreadId" TEXT NOT NULL,
        "fromEmail" TEXT NOT NULL,
        "fromName" TEXT,
        "snippet" TEXT,
        "receivedAt" TIMESTAMP(3) NOT NULL,
        "isHandled" BOOLEAN NOT NULL DEFAULT false,
        "handledAt" TIMESTAMP(3),
        "handledBy" TEXT,
        CONSTRAINT "EmailReply_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "EmailReply_sentEmailId_fkey" FOREIGN KEY ("sentEmailId") REFERENCES "SentEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `),
    prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "EmailReply_gmailMessageId_key"
      ON "EmailReply"("gmailMessageId")
    `),
    prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "EmailReply_receivedAt_idx"
      ON "EmailReply"("receivedAt")
    `),
  ]).then(() => undefined);

  return emailReplySchemaReady;
}
