import { CoupleStatus, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getActiveCoupleForUser(userId: string) {
  return prisma.couple.findFirst({
    where: {
      status: CoupleStatus.ACTIVE,
      OR: [{ partnerAId: userId }, { partnerBId: userId }],
    },
  });
}

export async function canAccessSharedResource(
  userId: string,
  resource: { coupleId: string | null; visibility: Visibility },
) {
  if (
    resource.visibility !== Visibility.SHARED_WITH_PARTNER ||
    !resource.coupleId
  ) {
    return false;
  }

  const couple = await prisma.couple.findFirst({
    where: {
      id: resource.coupleId,
      status: CoupleStatus.ACTIVE,
      OR: [{ partnerAId: userId }, { partnerBId: userId }],
    },
    select: { id: true },
  });

  return couple !== null;
}
