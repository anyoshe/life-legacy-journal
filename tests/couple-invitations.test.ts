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
    coupleInvitation: {
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
        create: vi.fn(),
      },
      coupleInvitation: {
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
  id: "invitation-1",
  senderId: "user-a",
  recipientEmail: "b@example.test",
  status: "PENDING",
  tokenHash: hashCoupleInvitationToken(token),
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date("2026-09-27T10:00:00Z"),
  sender: { id: "user-a", name: "A", email: "a@example.test" },
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
    mocks.tx.coupleInvitation.findFirst.mockReset().mockResolvedValue(null);
    mocks.tx.coupleInvitation.create.mockResolvedValue({ id: pendingInvitation.id });
    mocks.tx.coupleInvitation.update.mockResolvedValue({ id: pendingInvitation.id });
    mocks.tx.couple.findFirst.mockReset().mockResolvedValue(null);
    mocks.tx.couple.create.mockResolvedValue({ id: "couple-1" });
    mocks.prisma.couple.findMany.mockResolvedValue([]);
    mocks.prisma.couple.findFirst.mockResolvedValue(null);
    mocks.prisma.coupleInvitation.findMany.mockResolvedValue([]);
    mocks.prisma.coupleInvitation.findFirst.mockResolvedValue(pendingInvitation);
    mocks.prisma.coupleInvitation.updateMany.mockResolvedValue({ count: 1 });
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

  it("creates an email invitation and sends a secure link for a registered address", async () => {
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
    expect(mocks.tx.coupleInvitation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        senderId: "user-a",
        recipientEmail: "b@example.test",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        status: "PENDING",
      }),
    }));
    expect(mocks.tx.couple.create).not.toHaveBeenCalled();
    expect(mocks.sendCoupleInvitationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "b@example.test",
      inviterName: "A",
      invitationUrl: `https://example.test/couple/invite/${token}`,
    }));
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("returns the same generic response for an unregistered address and creates no invitation", async () => {
    mocks.tx.user.findFirst.mockResolvedValue(null);
    const response = await createInvitation(request("/api/couples/invitations", {
      email: "unknown@example.test",
    }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ message: "Invitation request processed." });
    await runAfterCallbacks();
    expect(mocks.tx.coupleInvitation.create).not.toHaveBeenCalled();
    expect(mocks.sendCoupleInvitationEmail).not.toHaveBeenCalled();
  });

  it("does not process an invitation for an unauthenticated caller", async () => {
    mocks.getCurrentDbUser.mockResolvedValue(null);
    const response = await createInvitation(request("/api/couples/invitations", {
      email: "b@example.test",
    }));

    expect(response.status).toBe(401);
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.tx.coupleInvitation.create).not.toHaveBeenCalled();
  });

  it("uses the authenticated database user as sender", async () => {
    await createInvitation(request("/api/couples/invitations", { email: "b@example.test" }));
    await runAfterCallbacks();
    expect(mocks.tx.coupleInvitation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ senderId: "user-a" }),
    }));
  });

  it("refreshes an existing valid invitation with a new token and expiry", async () => {
    mocks.tx.coupleInvitation.findFirst.mockResolvedValueOnce({ id: "old-invitation" });
    await createInvitation(request("/api/couples/invitations", { email: "b@example.test" }));
    await runAfterCallbacks();

    expect(mocks.tx.coupleInvitation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "old-invitation" },
      data: expect.objectContaining({
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        status: "PENDING",
      }),
    }));
    expect(mocks.tx.coupleInvitation.create).not.toHaveBeenCalled();
    expect(mocks.sendCoupleInvitationEmail).toHaveBeenCalledOnce();
  });

  it("reuses a rejected invitation record for a fresh retry", async () => {
    const oldHash = hashCoupleInvitationToken("B".repeat(43));
    mocks.tx.coupleInvitation.findFirst.mockResolvedValueOnce({ id: "old-invitation", tokenHash: oldHash });
    await createInvitation(request("/api/couples/invitations", { email: "b@example.test" }));
    await runAfterCallbacks();

    expect(mocks.tx.coupleInvitation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "old-invitation" },
      data: expect.objectContaining({ status: "PENDING", tokenHash: expect.any(String) }),
    }));
    expect(mocks.tx.coupleInvitation.update.mock.calls[0][0].data.tokenHash).not.toBe(oldHash);
    expect(mocks.tx.coupleInvitation.create).not.toHaveBeenCalled();
    expect(mocks.sendCoupleInvitationEmail).toHaveBeenCalledOnce();
  });

  it("reuses an expired invitation record with a fresh expiry and token", async () => {
    const oldHash = hashCoupleInvitationToken("B".repeat(43));
    mocks.tx.coupleInvitation.findFirst.mockResolvedValueOnce({ id: "old-invitation", tokenHash: oldHash });
    await createInvitation(request("/api/couples/invitations", { email: "b@example.test" }));
    await runAfterCallbacks();

    const refreshed = mocks.tx.coupleInvitation.update.mock.calls[0][0].data;
    expect(refreshed.status).toBe("PENDING");
    expect(refreshed.tokenHash).not.toBe(oldHash);
    expect(refreshed.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(mocks.tx.coupleInvitation.create).not.toHaveBeenCalled();
  });

  it("keeps a failed delivery retryable while invalidating the failed token", async () => {
    mocks.sendCoupleInvitationEmail.mockRejectedValueOnce(new Error("provider unavailable"));
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await createInvitation(request("/api/couples/invitations", { email: "b@example.test" }));
    expect(response.status).toBe(202);
    await runAfterCallbacks();
    expect(mocks.prisma.coupleInvitation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: pendingInvitation.id,
        tokenHash: expect.any(String),
        status: "PENDING",
      }),
      data: expect.objectContaining({
        status: "EXPIRED",
        tokenHash: null,
        expiresAt: expect.any(Date),
      }),
    }));
    mocks.tx.coupleInvitation.findFirst.mockReset()
      .mockResolvedValueOnce({ id: pendingInvitation.id })
      .mockResolvedValueOnce(null);
    mocks.tx.couple.findFirst.mockReset().mockResolvedValue(null);
    await createInvitation(request("/api/couples/invitations", { email: "b@example.test" }));
    await runAfterCallbacks();
    expect(mocks.tx.coupleInvitation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: pendingInvitation.id },
      data: expect.objectContaining({ status: "PENDING", tokenHash: expect.any(String) }),
    }));
    logError.mockRestore();
  });

  it("does not create invitations for users who already have an active relationship", async () => {
    mocks.tx.couple.findFirst.mockResolvedValue({ id: "active-couple" });
    await createInvitation(request("/api/couples/invitations", { email: "b@example.test" }));
    await runAfterCallbacks();

    expect(mocks.tx.coupleInvitation.create).not.toHaveBeenCalled();
    expect(mocks.sendCoupleInvitationEmail).not.toHaveBeenCalled();
  });

  it("lists invitations for the authenticated verified recipient without journal data", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-b", email: "b@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("b@example.test");
    mocks.prisma.coupleInvitation.findMany.mockResolvedValue([pendingInvitation]);
    const response = await listInvitations();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.incoming[0]).not.toHaveProperty("content");
    expect(mocks.prisma.coupleInvitation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        recipientEmail: { equals: "b@example.test", mode: "insensitive" },
        status: "PENDING",
      }),
    }));
  });

  it("accepts the intended invitation and creates an active Couple in one transaction", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-b", email: "b@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("b@example.test");
    mocks.tx.coupleInvitation.findFirst
      .mockResolvedValueOnce(pendingInvitation)
      .mockResolvedValueOnce(null);
    const response = await respondToTokenInvitation(
      request(`/api/couples/invitations/token/${token}`, { decision: "accept" }),
      { params: Promise.resolve({ token }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.tx.couple.create).toHaveBeenCalledWith({
      data: { partnerAId: "user-a", partnerBId: "user-b", status: "ACTIVE" },
      select: { id: true },
    });
    expect(mocks.tx.coupleInvitation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: pendingInvitation.id },
      data: { status: "ACCEPTED", tokenHash: null },
    }));
  });

  it("allows rejection by the intended verified recipient and invalidates the token", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-b", email: "b@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("b@example.test");
    mocks.tx.coupleInvitation.findFirst.mockResolvedValue(pendingInvitation);
    const response = await respondToTokenInvitation(
      request(`/api/couples/invitations/token/${token}`, { decision: "reject" }),
      { params: Promise.resolve({ token }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.tx.couple.create).not.toHaveBeenCalled();
    expect(mocks.tx.coupleInvitation.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "REJECTED", tokenHash: null },
    }));
  });

  it("does not let a different verified email claim the invitation", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-c", email: "other@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("other@example.test");
    mocks.tx.coupleInvitation.findFirst.mockResolvedValue(pendingInvitation);
    const response = await respondToTokenInvitation(
      request(`/api/couples/invitations/token/${token}`, { decision: "accept" }),
      { params: Promise.resolve({ token }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.tx.couple.create).not.toHaveBeenCalled();
    expect(mocks.tx.coupleInvitation.update).not.toHaveBeenCalled();
  });

  it("does not let another account accept or reject an invitation by database ID", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-c", email: "other@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("other@example.test");
    mocks.tx.coupleInvitation.findFirst.mockResolvedValue(null);
    mocks.tx.couple.findFirst.mockResolvedValue(null);
    const response = await respondToInvitation(
      request("/api/couples/invitations/invitation-1", { decision: "reject" }, "PATCH"),
      { params: Promise.resolve({ invitationId: pendingInvitation.id }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.tx.coupleInvitation.update).not.toHaveBeenCalled();
    expect(mocks.tx.couple.update).not.toHaveBeenCalled();
  });

  it("does not create a duplicate Couple during acceptance", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-b", email: "b@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("b@example.test");
    mocks.tx.coupleInvitation.findFirst.mockResolvedValueOnce(pendingInvitation);
    mocks.tx.couple.findFirst.mockResolvedValueOnce({ id: "existing-couple" });
    const response = await respondToTokenInvitation(
      request(`/api/couples/invitations/token/${token}`, { decision: "accept" }),
      { params: Promise.resolve({ token }) },
    );

    expect(response.status).toBe(409);
    expect(mocks.tx.couple.create).not.toHaveBeenCalled();
    expect(mocks.tx.coupleInvitation.update).not.toHaveBeenCalled();
  });

  it("rejects used or expired invitation tokens", async () => {
    mocks.prisma.coupleInvitation.findFirst.mockResolvedValue(null);
    const response = await inspectTokenInvitation(
      request(`/api/couples/invitations/token/${token}`, undefined, "GET"),
      { params: Promise.resolve({ token }) },
    );
    expect(response.status).toBe(404);
  });

  it("supports legacy pending Couple invitations without changing their authorization", async () => {
    mocks.getCurrentDbUser.mockResolvedValue({ id: "user-b", email: "b@example.test" });
    mocks.getCurrentVerifiedEmail.mockResolvedValue("b@example.test");
    mocks.tx.coupleInvitation.findFirst.mockResolvedValueOnce(null);
    mocks.tx.couple.findFirst
      .mockResolvedValueOnce({
      id: "legacy-invitation",
      partnerAId: "user-a",
      partnerBId: "user-b",
      })
      .mockResolvedValueOnce(null);
    const response = await respondToInvitation(
      request("/api/couples/invitations/legacy-invitation", { decision: "accept" }, "PATCH"),
      { params: Promise.resolve({ invitationId: "legacy-invitation" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.tx.couple.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "legacy-invitation" },
      data: { status: "ACTIVE" },
    }));
  });
});
