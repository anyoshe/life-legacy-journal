import { CoupleInvitationStatus, CoupleStatus, Prisma } from "@prisma/client";
import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser, getCurrentVerifiedEmail } from "@/lib/auth";
import {
  getCoupleInvitationUrl,
  sendCoupleInvitationEmail,
} from "@/lib/couple-invitation-email";
import {
  COUPLE_INVITATION_TTL_MS,
  createCoupleInvitationToken,
  hashCoupleInvitationToken,
  normalizeInvitationEmail,
} from "@/lib/couple-invitation-token";
import { prisma } from "@/lib/prisma";

const invitationSchema = z.object({
  email: z.string().trim().email().max(320),
}).strict();

function isPrismaConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034");
}

function invitationRequestProcessed() {
  return NextResponse.json(
    { message: "Invitation request processed." },
    { status: 202 },
  );
}

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const verifiedEmail = await getCurrentVerifiedEmail();
  if (!verifiedEmail) return NextResponse.json({ error: "A verified email is required." }, { status: 403 });

  const [emailInvitations, legacyInvitations, outgoing, relationship] = await Promise.all([
    prisma.coupleInvitation.findMany({
      where: {
        recipientEmail: { equals: verifiedEmail, mode: "insensitive" },
        status: CoupleInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        recipientEmail: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        sender: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.couple.findMany({
      where: { partnerBId: user.id, status: CoupleStatus.PENDING },
      select: {
        id: true,
        createdAt: true,
        partnerA: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupleInvitation.findMany({
      where: {
        senderId: user.id,
        status: CoupleInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        recipientEmail: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.couple.findFirst({
      where: {
        status: CoupleStatus.ACTIVE,
        OR: [{ partnerAId: user.id }, { partnerBId: user.id }],
      },
      select: {
        id: true,
        partnerAId: true,
        partnerB: { select: { name: true, email: true } },
        partnerA: { select: { name: true, email: true } },
      },
    }),
  ]);

  const incoming = [
    ...emailInvitations.map((invitation) => ({
      id: invitation.id,
      inviteeEmail: invitation.recipientEmail,
      invitationStatus: invitation.status,
      invitationExpiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      partnerA: invitation.sender,
    })),
    ...legacyInvitations.map((invitation) => ({
      id: invitation.id,
      inviteeEmail: null,
      invitationStatus: null,
      invitationExpiresAt: null,
      createdAt: invitation.createdAt,
      partnerA: invitation.partnerA,
    })),
  ];

  const partner = relationship
    ? relationship.partnerAId === user.id
      ? relationship.partnerB
      : relationship.partnerA
    : null;

  return NextResponse.json({ incoming, outgoing, relationship: partner });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid invitation details." }, { status: 400 });
  }

  const parsed = invitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const senderId = user.id;
  const senderName = user.name?.trim() || "A Life & Legacy member";
  const email = normalizeInvitationEmail(parsed.data.email);
  const token = createCoupleInvitationToken();
  const tokenHash = hashCoupleInvitationToken(token);
  const expiresAt = new Date(Date.now() + COUPLE_INVITATION_TTL_MS);

  after(async () => {
    try {
      const invitation = await prisma.$transaction(async (tx) => {
        const invitee = await tx.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { id: true },
        });
        if (!invitee || invitee.id === senderId) return null;

        const existingInvitation = await tx.coupleInvitation.findFirst({
          where: {
            senderId,
            recipientEmail: { equals: email, mode: "insensitive" },
            status: {
              in: [
                CoupleInvitationStatus.PENDING,
                CoupleInvitationStatus.EXPIRED,
                CoupleInvitationStatus.REJECTED,
              ],
            },
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });

        const activeCouple = await tx.couple.findFirst({
          where: {
            status: CoupleStatus.ACTIVE,
            OR: [
              { partnerAId: { in: [senderId, invitee.id] } },
              { partnerBId: { in: [senderId, invitee.id] } },
            ],
          },
          select: { id: true },
        });
        if (activeCouple) return null;

        const pendingConflict = await tx.coupleInvitation.findFirst({
          where: {
            id: existingInvitation ? { not: existingInvitation.id } : undefined,
            status: CoupleInvitationStatus.PENDING,
            expiresAt: { gt: new Date() },
            OR: [
              { senderId: invitee.id },
              { recipientEmail: { equals: email, mode: "insensitive" } },
              { recipientEmail: { equals: user.email, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        });
        if (pendingConflict) return null;

        const legacyPendingConflict = await tx.couple.findFirst({
          where: {
            status: CoupleStatus.PENDING,
            OR: [
              { partnerAId: { in: [senderId, invitee.id] } },
              { partnerBId: { in: [senderId, invitee.id] } },
            ],
          },
          select: { id: true },
        });
        if (legacyPendingConflict) return null;

        if (existingInvitation) {
          return tx.coupleInvitation.update({
            where: { id: existingInvitation.id },
            data: {
              tokenHash,
              expiresAt,
              status: CoupleInvitationStatus.PENDING,
            },
            select: { id: true },
          });
        }

        return tx.coupleInvitation.create({
          data: {
            senderId,
            recipientEmail: email,
            tokenHash,
            expiresAt,
            status: CoupleInvitationStatus.PENDING,
          },
          select: { id: true },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (invitation) {
        try {
          const invitationUrl = getCoupleInvitationUrl(token);
          await sendCoupleInvitationEmail({
            to: email,
            inviterName: senderName,
            invitationUrl,
            expiresAt,
          });
        } catch (error) {
          await prisma.coupleInvitation.updateMany({
            where: {
              id: invitation.id,
              tokenHash,
              status: CoupleInvitationStatus.PENDING,
            },
            data: {
              status: CoupleInvitationStatus.EXPIRED,
              tokenHash: null,
              expiresAt: new Date(),
            },
          });
          console.error("Failed to send Life & Legacy couple invitation email.", error);
        }
      }
    } catch (error) {
      if (!isPrismaConflict(error)) {
        console.error("Failed to process Life & Legacy couple invitation request.", error);
      }
    }
  });

  return invitationRequestProcessed();
}
