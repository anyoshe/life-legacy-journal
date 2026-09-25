import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

/**
 * Gets the currently signed-in Clerk user and ensures
 * a matching record exists in our Prisma User table.
 * Returns the Prisma User or null if not authenticated.
 */
export async function getCurrentDbUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    return null;
  }

  // Upsert so we always have a local user record
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: clerkUser.firstName
        ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ""}`
        : clerkUser.username || null,
      image: clerkUser.imageUrl || null,
    },
    create: {
      email,
      name: clerkUser.firstName
        ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ""}`
        : clerkUser.username || null,
      image: clerkUser.imageUrl || null,
    },
  });

  return user;
}
