import { PrismaClient } from "@prisma/client";

/**
 * Neon + Next.js: use the *pooled* DATABASE_URL (…-pooler… / ?pgbouncer=true).
 * Prefer connection_limit in the URL, e.g.:
 *   ?pgbouncer=true&connection_limit=5&connect_timeout=15
 * Avoid opening many PrismaClients in dev (globalThis cache).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
