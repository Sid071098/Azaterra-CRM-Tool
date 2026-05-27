import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { ensureEmailReplyTables } from "@/lib/emailReplySchema";
import RepliedEmailsClient from "@/components/RepliedEmailsClient";

export const dynamic = "force-dynamic";

export default async function EmailRepliesPage() {
  await ensureEmailReplyTables();
  const session = readSession();
  const where =
    session?.role === "SalesRep"
      ? { isHandled: false, sentEmail: { salesPersonId: session.salesPersonId ?? "" } }
      : { isHandled: false };

  const replies = await prisma.emailReply.findMany({
    where,
    include: {
      inquiry: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
        },
      },
    },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  return (
    <RepliedEmailsClient
      replies={replies.map((reply) => ({
        id: reply.id,
        fromName: reply.fromName,
        fromEmail: reply.fromEmail,
        snippet: reply.snippet,
        receivedAt: reply.receivedAt.toISOString(),
        gmailThreadId: reply.gmailThreadId,
        inquiry: reply.inquiry,
      }))}
    />
  );
}
