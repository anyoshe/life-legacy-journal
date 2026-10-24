import { currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

async function currentUserWithRetry(attempts = 2): Promise<User | null> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const u = await currentUser();
      return u;
    } catch (e) {
      lastErr = e;
      // Brief backoff for transient Clerk API blips
      await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  console.error("Clerk currentUser failed after retries:", lastErr);
  return null;
}

export async function getCurrentVerifiedEmail() {
  const clerkUser = await currentUserWithRetry();
  if (clerkUser?.primaryEmailAddress?.verification?.status !== "verified") {
    return null;
  }
  return clerkUser.primaryEmailAddress.emailAddress.trim().toLowerCase();
}

/**
 * Resolve the app User row for the signed-in Clerk user.
 * Avoids writing the DB on every request when profile fields are unchanged
 * (reduces Neon load and failed updates during connection blips).
 */
export async function getCurrentDbUser() {
  const clerkUser = await currentUserWithRetry();
  if (!clerkUser) return null;

  const primaryEmail = clerkUser.primaryEmailAddress;
  const profile = {
    name: clerkUser.firstName
      ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ""}`
      : clerkUser.username || null,
    image: clerkUser.imageUrl || null,
  };
  const verifiedEmail =
    primaryEmail?.verification?.status === "verified"
      ? primaryEmail.emailAddress.toLowerCase()
      : null;

  try {
    const existingByClerkId = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (existingByClerkId) {
      const emailChanged =
        verifiedEmail &&
        existingByClerkId.email.toLowerCase() !== verifiedEmail;
      const nameChanged = existingByClerkId.name !== profile.name;
      const imageChanged = existingByClerkId.image !== profile.image;

      if (!emailChanged && !nameChanged && !imageChanged) {
        return existingByClerkId;
      }

      return prisma.user.update({
        where: { id: existingByClerkId.id },
        data: {
          ...profile,
          ...(verifiedEmail ? { email: verifiedEmail } : {}),
        },
      });
    }

    if (!verifiedEmail) return null;

    const existingByEmail = await prisma.user.findMany({
      where: {
        email: { equals: verifiedEmail, mode: "insensitive" },
        clerkId: null,
      },
      select: { id: true },
      take: 2,
    });
    if (existingByEmail.length === 1) {
      return prisma.user.update({
        where: { id: existingByEmail[0].id },
        data: {
          ...profile,
          email: verifiedEmail,
          clerkId: clerkUser.id,
        },
      });
    }
    if (existingByEmail.length > 1) return null;

    return prisma.user.create({
      data: {
        ...profile,
        clerkId: clerkUser.id,
        email: verifiedEmail,
      },
    });
  } catch (e) {
    console.error("getCurrentDbUser database error:", e);
    return null;
  }
}
