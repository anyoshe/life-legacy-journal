import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as listInvitations,
  POST as createInvitation,
} from "@/app/api/couples/invitations/route";
import { PATCH as respondToInvitation } from "@/app/api/couples/invitations/[invitationId]/route";
import {
  GET as inspectTokenInvitation,
  POST as respondToTokenInvitation,
} from "@/app/api/couples/invitations/token/[token]/route";
import { hashCoupleInvitationToken } from "@/lib/couple-invitation-token";

const mocks = vi.hoisted(() => {
  const tx = {
    user: { findFirst: vi.fn() },
    couple: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const afterCallbacks: Array<() => Promise<void>> = [];
  return {
    getCurrentDbUser: vi.fn(),
    getCurrentVerifiedEmail: vi.fn(),
    tx,
    afterCallbacks,
    after: vi.fn((callback: () => Promise<void>) => {
      afterCallbacks.push(callback);
    }),
    sendCoupleInvitationEmail: vi.fn(),
    getCoupleInvitationUrl: vi.fn(),
    prisma: {
      $transaction: vi.fn(),
      couple: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/auth", () => ({
  getCurrentDbUser: mocks.getCurrentDbUser,
  getCurrentVerifiedEmail: mocks.getCurrentVerifiedEmail,
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/couple-invitation-email", () => ({
  sendCoupleInvitationEmail: mocks.sendCoupleInvitationEmail,
  getCoupleInvitationUrl: mocks.getCoupleInvitationUrl,
}));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: mocks.after };
});

const token = "A".repeat(43);
const pendingInvitation = {
  id: "invite-1",
  partnerAId: "user-a",
  partnerBId: null,
  inviteeEmail: "b@example.test",
  invitationStatus: "PENDING",
  invitationTokenHash: hashCoupleInvitationToken(token),
  invitationExpiresAt: new Date(Date.now() + 60_000),
  status: "PENDING",
  createdAt: new Date("2026-09-27T10:00:00Z"),
  partnerA: { name: "A", email: "a@example.test" },
};

function request(path: string, body?: unknown, method = "POST") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function runAfterCallbacks() {
  const callbacks = mocks.afterCallbacks.splice(0);
  await Promise.all(callbacks.map((callback) => callback()));
}

describe("couple invitation workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.afterCallbacks.length = 0;
    mocks.getCurrentDbUser.mockResolvedValue({
      id: "user-a",
      email: "a@example.test",
      name: "A",
    });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("a@example.test");
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) => callback(mocks.tx),
    );
    mocks.tx.user.findFirst.mockResolvedValue({ id: "user-b" });
    mocks.tx.couple.findFirst.mockReset().mockResolvedValue(null);
    mocks.tx.couple.create.mockResolvedValue({ id: "invite-1" });
    mocks.tx.couple.update.mockImplementation(async ({ data }: { data: { status: string } }) => ({
      id: pendingInvitation.id,
      status: data.status,
      createdAt: pendingInvitation.createdAt,
    }));
    mocks.prisma.couple.findFirst.mockResolvedValue(pendingInvitation);
    mocks.prisma.couple.findMany.mockResolvedValue([]);
    mocks.prisma.couple.updateMany.mockResolvedValue({ count: 1 });
    mocks.getCoupleInvitationUrl.mockReturnValue(`https://example.test/couple/invite/${token}`);
    mocks.sendCoupleInvitationEmail.mockResolvedValue(undefined);
  });

  it("rejects client-supplied sender identity", async () => {
    const response = await createInvitation(request("/api/couples/invitations", {
      email: "b@example.test",
      userId: "user-c",
    }));

    expect(response.status).toBe(400);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("returns generic success and emails a secure invitation for a registered email", async () => {
    const response = await createInvitation(request("/api/couples/invitations", {
      email: "B@Example.Test",
    }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ message: "Invitation request processed." });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();

    await runAfterCallbacks();
    expect(mocks.tx.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "b@example.test", mode: "insensitive" } },
      select: { id: true },
    });
    expect(mocks.tx.couple.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        partnerAId: "user-a",
        inviteeEmail: "b@example.test",
        invitationTokenHash: expect.any(String),
        invitationExpiresAt: expect.any(Date),
        invitationStatus: "PENDING",
        status: "PENDING",
      }),
    }));
    expect(mocks.tx.couple.create.mock.calls[0][0].data).not.toHaveProperty("partnerBId");
    expect(mocks.sendCoupleInvitationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "b@example.test",
      inviterName: "A",
      invitationUrl: `https://example.test/couple/invite/${token}`,
    }));
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("returns identical generic success for an unregistered email but creates no invitation", async () => {
    mocks.tx.user.findFirst.mockResolvedValue(null);
    const response = await createInvitation(request("/api/couples/invitations", {
      email: "unknown@example.test",
    }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ message: "Invitation request processed." });

    await runAfterCallbacks();
    expect(mocks.tx.couple.create).not.toHaveBeenCalled();
    expect(mocks.sendCoupleInvitationEmail).not.toHaveBeenCalled();
  });

  it("does not create invitations for unauthenticated callers", async () => {
    mocks.getCurrentDbUser.mockResolvedValue(null);
    const response = await createInvitation(request("/api/couples/invitations", {
      email: "b@example.test",
    }));

    expect(response.status).toBe(401);
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.tx.couple.create).not.toHaveBeenCalled();
  });

  it("uses the authenticated database user as sender", async () => {
    await createInvitation(request("/api/couples/invitations", {
      email: "b@example.test",
    }));
    await runAfterCallbacks();

    expect(mocks.tx.couple.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ partnerAId: "user-a" }),
    }));
  });

  it("returns generic success without sending a duplicate pending or active relationship", async () => {
    mocks.tx.couple.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing" });
    const response = await createInvitation(request("/api/couples/invitations", {
      email: "b@example.test",
    }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ message: "Invitation request processed." });
    await runAfterCallbacks();
    expect(mocks.tx.couple.create).not.toHaveBeenCalled();
    expect(mocks.sendCoupleInvitationEmail).not.toHaveBeenCalled();
  });

  it("only treats unexpired token invitations as pending relationship conflicts", async () => {
    mocks.tx.couple.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const response = await createInvitation(request("/api/couples/invitations", {
      email: "b@example.test",
    }));
    await runAfterCallbacks();

    expect(response.status).toBe(202);
    const conflictQuery = mocks.tx.couple.findFirst.mock.calls[1][0];
    expect(conflictQuery.where.OR[1].AND[1].OR).toContainEqual(expect.objectContaining({
      invitationStatus: "PENDING",
      invitationExpiresAt: expect.objectContaining({ gt: expect.any(Date) }),
    }));
    expect(mocks.tx.couple.create).toHaveBeenCalled();
  });

  it("invalidates the invitation if the email provider fails", async () => {
    mocks.sendCoupleInvitationEmail.mockRejectedValueOnce(new Error("provider unavailable"));
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await createInvitation(request("/api/couples/invitations", {
      email: "b@example.test",
    }));
    expect(response.status).toBe(202);
    await runAfterCallbacks();
    expect(mocks.prisma.couple.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "invite-1",
        invitationStatus: "PENDING",
      }),
      data: expect.objectContaining({
        invitationStatus: "EXPIRED",
        invitationExpiresAt: expect.any(Date),
      }),
    }));
    logError.mockRestore();
  });

  it("lists only invitations addressed to the authenticated verified email", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-b", email: "b@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("b@example.test");
    mocks.prisma.couple.findMany.mockResolvedValue([pendingInvitation]);
    mocks.prisma.couple.findFirst.mockResolvedValue(null);
    const response = await listInvitations();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.incoming[0]).not.toHaveProperty("content");
    expect(mocks.prisma.couple.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "PENDING",
        OR: expect.arrayContaining([
          expect.objectContaining({
            inviteeEmail: { equals: "b@example.test", mode: "insensitive" },
          }),
        ]),
      }),
      select: expect.objectContaining({
        id: true,
        partnerA: { select: { name: true, email: true } },
      }),
    }));
  });

  it("accepts or rejects an ID invitation only when the authenticated verified email is its recipient", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-b", email: "b@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("b@example.test");
    mocks.tx.couple.findFirst
      .mockResolvedValueOnce(pendingInvitation)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pendingInvitation)
      .mockResolvedValueOnce(null);

    const accepted = await respondToInvitation(
      request("/api/couples/invitations/invite-1", { decision: "accept" }, "PATCH"),
      { params: Promise.resolve({ invitationId: "invite-1" }) },
    );
    expect(accepted.status).toBe(200);
    expect(mocks.tx.couple.update).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: "invite-1" },
      data: expect.objectContaining({
        status: "ACTIVE",
        partnerBId: "user-b",
        invitationStatus: "ACCEPTED",
        invitationTokenHash: null,
      }),
    }));

    const rejected = await respondToInvitation(
      request("/api/couples/invitations/invite-1", { decision: "reject" }, "PATCH"),
      { params: Promise.resolve({ invitationId: "invite-1" }) },
    );
    expect(rejected.status).toBe(200);
    expect(mocks.tx.couple.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "DISSOLVED",
        partnerBId: null,
        invitationStatus: "REJECTED",
        invitationTokenHash: null,
      }),
    }));
  });

  it("does not allow a different verified email to use the invitation", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-b", email: "other@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("other@example.test");
    mocks.tx.couple.findFirst.mockResolvedValue(pendingInvitation);
    const response = await respondToTokenInvitation(
      request(`/api/couples/invitations/token/${token}`, { decision: "accept" }),
      { params: Promise.resolve({ token }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.tx.couple.update).not.toHaveBeenCalled();
  });

  it("lets only the intended verified recipient accept a one-time link", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-b", email: "b@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("B@Example.Test");
    mocks.tx.couple.findFirst
      .mockResolvedValueOnce(pendingInvitation)
      .mockResolvedValueOnce(null);

    const response = await respondToTokenInvitation(
      request(`/api/couples/invitations/token/${token}`, { decision: "accept" }),
      { params: Promise.resolve({ token }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.tx.couple.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "invite-1" },
      data: expect.objectContaining({
        status: "ACTIVE",
        partnerBId: "user-b",
        invitationStatus: "ACCEPTED",
        invitationTokenHash: null,
      }),
    }));
  });

  it("rejects expired or consumed invitation links", async () => {
    mocks.prisma.couple.findFirst.mockResolvedValue(null);
    const response = await inspectTokenInvitation(
      request(`/api/couples/invitations/token/${token}`, undefined, "GET"),
      { params: Promise.resolve({ token }) },
    );
    expect(response.status).toBe(404);
  });
});
