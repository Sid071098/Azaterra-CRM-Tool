import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { readSession } from "@/lib/session";
import { getOwnerGmail } from "@/lib/ownerGmail";
import { readOrderStatusDetails } from "@/lib/orderStatusDetails";
import EmailDraftPage from "@/components/EmailDraftPage";

export const dynamic = "force-dynamic";

export default async function InquiryEmailPage({ params }: { params: { id: string } }) {
  const session = readSession();
  const sessionUser = await getSessionUser();
  const [inquiry, sessionSalesPerson, ownerGmail] = await Promise.all([
    prisma.inquiry.findUnique({
      where: { id: params.id },
      include: { salesPerson: true },
    }),
    session?.salesPersonId
      ? prisma.salesPerson.findUnique({ where: { id: session.salesPersonId } })
      : Promise.resolve(null),
    session?.role === "Owner" ? getOwnerGmail(session.ownerId) : Promise.resolve(null),
  ]);

  if (!inquiry) notFound();

  const fromEmail =
    ownerGmail?.googleEmail ??
    sessionSalesPerson?.googleEmail ??
    sessionSalesPerson?.email ??
    inquiry.salesPerson?.googleEmail ??
    inquiry.salesPerson?.email ??
    sessionUser?.email ??
    null;
  const fromName =
    session?.role === "Owner"
      ? session.name
      : sessionSalesPerson
      ? `${sessionSalesPerson.firstName} ${sessionSalesPerson.lastName}`
      : inquiry.salesPerson
        ? `${inquiry.salesPerson.firstName} ${inquiry.salesPerson.lastName}`
        : sessionUser?.fullName ?? session?.name ?? "Azaterra Sales";
  const senderRoleLabel = session?.role === "Owner" ? "Owner" : "Sales rep";
  const orderStatus = readOrderStatusDetails(inquiry.notes);

  return (
    <EmailDraftPage
      inquiry={{
        id: inquiry.id,
        companyName: inquiry.companyName,
        contactName: inquiry.contactName,
        email: inquiry.email,
        product: inquiry.product,
        stage: inquiry.stage,
        orderStatus: orderStatus.status,
        invoiceName: orderStatus.invoiceName,
      }}
      fromEmail={fromEmail}
      fromName={fromName}
      senderRoleLabel={senderRoleLabel}
      gmailConnected={Boolean(ownerGmail?.googleRefreshToken ?? sessionSalesPerson?.googleRefreshToken)}
    />
  );
}
