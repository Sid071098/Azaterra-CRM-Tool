import { prisma } from "@/lib/db";
import { ensureEmailReplyTables } from "@/lib/emailReplySchema";
import { getGmailThread, getHeader, parseEmailAddress, refreshAccessToken } from "@/lib/gmail";

type GmailAccount = {
  email: string;
  refreshToken: string;
  salesPersonId?: string | null;
  ownerId?: string | null;
};

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function syncUnreadRepliesForAccount(account: GmailAccount) {
  await ensureEmailReplyTables();
  const accessToken = await refreshAccessToken(account.refreshToken);
  const sentEmails = await prisma.sentEmail.findMany({
    where: {
      fromEmail: account.email,
      ...(account.salesPersonId ? { salesPersonId: account.salesPersonId } : {}),
      ...(account.ownerId ? { ownerId: account.ownerId } : {}),
    },
    include: { inquiry: true },
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  let created = 0;
  const syncedAt = new Date();

  for (const sent of sentEmails) {
    if (!sent.gmailThreadId || !sent.inquiry.email) continue;
    const thread = await getGmailThread(accessToken, sent.gmailThreadId);
    const messages = thread.messages ?? [];

    for (const message of messages) {
      if (message.id === sent.gmailMessageId) continue;
      if (!message.labelIds?.includes("UNREAD")) continue;
      const receivedAt = message.internalDate
        ? new Date(Number(message.internalDate))
        : new Date(getHeader(message, "Date") || Date.now());
      if (receivedAt <= sent.sentAt) continue;

      const from = parseEmailAddress(getHeader(message, "From"));
      if (!from.email || from.email === sent.fromEmail.toLowerCase()) continue;
      if (sent.inquiry.email && from.email !== sent.inquiry.email.toLowerCase()) continue;

      await prisma.emailReply.upsert({
        where: { gmailMessageId: message.id },
        create: {
          id: id("reply"),
          inquiryId: sent.inquiryId,
          sentEmailId: sent.id,
          gmailMessageId: message.id,
          gmailThreadId: sent.gmailThreadId,
          fromEmail: from.email,
          fromName: from.name || sent.inquiry.contactName,
          snippet: message.snippet ?? null,
          receivedAt,
        },
        update: {
          snippet: message.snippet ?? null,
          receivedAt,
          isHandled: false,
          handledAt: null,
          handledBy: null,
        },
      });
      created += 1;
    }

    await prisma.sentEmail.update({
      where: { id: sent.id },
      data: { lastSyncedAt: syncedAt },
    });
  }

  return { checkedThreads: sentEmails.length, repliesFound: created };
}
