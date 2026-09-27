import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function getCurrentVerifiedEmail() {
  const clerkUser = await currentUser();
  if (clerkUser?.primaryEmailAddress?.verification?.status !== "verified") return null;
  return clerkUser.primaryEmailAddress.emailAddress.trim().toLowerCase();
}

export async function getCurrentDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const primaryEmail = clerkUser.primaryEmailAddress;

  const profile = {
    name: clerkUser.firstName
      ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ""}`
      : clerkUser.username || null,
    image: clerkUser.imageUrl || null,
  };
  const verifiedEmail = primaryEmail?.verification?.status === "verified"
    ? primaryEmail.emailAddress.toLowerCase()
    : null;

  const existingByClerkId = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (existingByClerkId) {
    return prisma.user.update({
      where: { id: existingByClerkId.id },
      data: { ...profile, ...(verifiedEmail ? { email: verifiedEmail } : {}) },
    });
  }

  if (!verifiedEmail) return null;

  const existingByEmail = await prisma.user.findMany({
    where: { email: { equals: verifiedEmail, mode: "insensitive" }, clerkId: null },
    select: { id: true },
    take: 2,
  });
  if (existingByEmail.length === 1) {
    return prisma.user.update({
      where: { id: existingByEmail[0].id },
      data: { ...profile, email: verifiedEmail, clerkId: clerkUser.id },
    });
  }
  if (existingByEmail.length > 1) return null;

  return prisma.user.create({ data: { ...profile, clerkId: clerkUser.id, email: verifiedEmail } });
}
