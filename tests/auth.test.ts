import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentDbUser } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: mocks.currentUser,
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

const clerkUser = {
  id: "clerk-user-a",
  firstName: "A",
  lastName: "User",
  username: null,
  imageUrl: "https://example.test/avatar.png",
  primaryEmailAddress: {
    emailAddress: "A@Example.Test",
    verification: { status: "verified" },
  },
};

describe("Clerk-to-database identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue(clerkUser);
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.prisma.user.findMany.mockResolvedValue([]);
    mocks.prisma.user.update.mockResolvedValue({ id: "db-user-a", email: "a@example.test" });
    mocks.prisma.user.create.mockResolvedValue({ id: "db-user-a", email: "a@example.test" });
  });

  it("uses the immutable Clerk ID to resolve an existing database user", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "db-user-a", clerkId: "clerk-user-a" });

    await getCurrentDbUser();

    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { clerkId: "clerk-user-a" },
    });
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "db-user-a" },
      data: {
        name: "A User",
        image: "https://example.test/avatar.png",
        email: "a@example.test",
      },
    });
  });

  it("does not create or adopt a database user from an unverified email", async () => {
    mocks.currentUser.mockResolvedValue({
      ...clerkUser,
      primaryEmailAddress: {
        ...clerkUser.primaryEmailAddress,
        verification: { status: "unverified" },
      },
    });

    expect(await getCurrentDbUser()).toBeNull();
    expect(mocks.prisma.user.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });

  it("links one verified legacy email record but refuses ambiguous matches", async () => {
    mocks.prisma.user.findMany.mockResolvedValueOnce([{ id: "legacy-a" }]);

    await getCurrentDbUser();

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "legacy-a" },
      data: {
        name: "A User",
        image: "https://example.test/avatar.png",
        email: "a@example.test",
        clerkId: "clerk-user-a",
      },
    });

    mocks.prisma.user.update.mockClear();
    mocks.prisma.user.create.mockClear();
    mocks.prisma.user.findMany.mockResolvedValueOnce([{ id: "legacy-a" }, { id: "legacy-b" }]);

    expect(await getCurrentDbUser()).toBeNull();
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });
});
