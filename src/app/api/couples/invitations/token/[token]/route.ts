import { CoupleInvitationStatus, CoupleStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser, getCurrentVerifiedEmail } from "@/lib/auth";
import {
  hashCoupleInvitationToken,
  isWellFormedCoupleInvitationToken,
  normalizeInvitationEmail,
} from "@/lib/couple-invitation-token";
import { prisma } from "@/lib/prisma";

const responseSchema = z.object({
  decision: z.enum(["accept", "reject"]),
}).strict();

class TokenInvitationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function isPrismaConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034");
}

async function findPendingInvitation(token: string) {
  if (!isWellFormedCoupleInvitationToken(token)) return null;
  return prisma.coupleInvitation.findFirst({
    where: {
      tokenHash: hashCoupleInvitationToken(token),
      status: CoupleInvitationStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    select: {
      recipientEmail: true,
      expiresAt: true,
      sender: { select: { name: true } },
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invitation = await findPendingInvitation(token);
  if (!invitation) {
    return NextResponse.json({ error: "This invitation is invalid or has expired." }, { status: 404 });
  }

  return NextResponse.json({
    invitation: {
      inviterName: invitation.sender.name,
      expiresAt: invitation.expiresAt,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const verifiedEmail = await getCurrentVerifiedEmail();
  if (!verifiedEmail) {
    return NextResponse.json({ error: "A verified email is required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid invitation response." }, { status: 400 });
  }
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose accept or reject." }, { status: 400 });
  }

  const { token } = await params;
  if (!isWellFormedCoupleInvitationToken(token)) {
    return NextResponse.json({ error: "This invitation is invalid or has expired." }, { status: 404 });
  }
  const tokenHash = hashCoupleInvitationToken(token);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.coupleInvitation.findFirst({
        where: {
          tokenHash,
          status: CoupleInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          senderId: true,
          recipientEmail: true,
          sender: { select: { email: true } },
        },
      });
      if (!invitation) {
        throw new TokenInvitationError("This invitation is invalid or has expired.", 404);
      }
      if (
        normalizeInvitationEmail(invitation.recipientEmail) !== normalizeInvitationEmail(verifiedEmail)
      ) {
        throw new TokenInvitationError("This invitation was sent to a different email address.", 403);
      }

      if (parsed.data.decision === "accept") {
        const existingCouple = await tx.couple.findFirst({
          where: {
            OR: [
              { partnerAId: { in: [invitation.senderId, user.id] } },
              { partnerBId: { in: [invitation.senderId, user.id] } },
            ],
          },
          select: { id: true },
        });
        if (existingCouple) {
          throw new TokenInvitationError(
            "One of these users already has a couple relationship record.",
            409,
          );
        }

        const otherPendingInvitation = await tx.coupleInvitation.findFirst({
          where: {
            id: { not: invitation.id },
            status: CoupleInvitationStatus.PENDING,
            expiresAt: { gt: new Date() },
            OR: [
              { senderId: { in: [invitation.senderId, user.id] } },
              { recipientEmail: { equals: invitation.recipientEmail, mode: "insensitive" } },
              { recipientEmail: { equals: invitation.sender.email, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        });
        if (otherPendingInvitation) {
          throw new TokenInvitationError(
            "One of these users already has another pending invitation.",
            409,
          );
        }

        await tx.couple.create({
          data: {
            partnerAId: invitation.senderId,
            partnerBId: user.id,
            status: CoupleStatus.ACTIVE,
          },
          select: { id: true },
        });
      }

      return tx.coupleInvitation.update({
        where: { id: invitation.id },
        data: {
          status: parsed.data.decision === "accept"
            ? CoupleInvitationStatus.ACCEPTED
            : CoupleInvitationStatus.REJECTED,
          tokenHash: null,
        },
        select: { id: true, status: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ invitation: result });
  } catch (error) {
    if (error instanceof TokenInvitationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isPrismaConflict(error)) {
      return NextResponse.json({ error: "A relationship or invitation already exists." }, { status: 409 });
    }
    console.error("Failed to respond to token couple invitation:", error);
    return NextResponse.json({ error: "Failed to respond to invitation." }, { status: 500 });
  }
}
