import { prisma } from "./db";

const OWNER_GMAIL_PREFIX = "gmail:";

export function ownerGmailId(ownerId: string) {
  return `${OWNER_GMAIL_PREFIX}${ownerId}`;
}

export async function getOwnerGmail(ownerId: string | null | undefined) {
  if (!ownerId) return null;
  const row = await prisma.ownerPin.findUnique({ where: { ownerId: ownerGmailId(ownerId) } });
  if (!row) return null;
  return {
    googleEmail: row.pinHash,
    googleRefreshToken: row.pinSalt,
    googleConnectedAt: row.updatedAt,
  };
}

export async function saveOwnerGmail(ownerId: string, googleEmail: string, googleRefreshToken: string) {
  return prisma.ownerPin.upsert({
    where: { ownerId: ownerGmailId(ownerId) },
    create: {
      ownerId: ownerGmailId(ownerId),
      pinHash: googleEmail,
      pinSalt: googleRefreshToken,
    },
    update: {
      pinHash: googleEmail,
      pinSalt: googleRefreshToken,
    },
  });
}
