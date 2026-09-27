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
  return prisma.couple.findFirst({
    where: {
      invitationTokenHash: hashCoupleInvitationToken(token),
      invitationStatus: CoupleInvitationStatus.PENDING,
      status: CoupleStatus.PENDING,
      invitationExpiresAt: { gt: new Date() },
    },
    select: {
      inviteeEmail: true,
      invitationExpiresAt: true,
      partnerA: { select: { name: true } },
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
      inviterName: invitation.partnerA.name,
      expiresAt: invitation.invitationExpiresAt,
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
      const invitation = await tx.couple.findFirst({
        where: {
          invitationTokenHash: tokenHash,
          invitationStatus: CoupleInvitationStatus.PENDING,
          status: CoupleStatus.PENDING,
          invitationExpiresAt: { gt: new Date() },
        },
        select: { id: true, partnerAId: true, inviteeEmail: true },
      });
      if (!invitation) {
        throw new TokenInvitationError("This invitation is invalid or has expired.", 404);
      }
      if (
        !invitation.inviteeEmail ||
        normalizeInvitationEmail(invitation.inviteeEmail) !== normalizeInvitationEmail(verifiedEmail)
      ) {
        throw new TokenInvitationError("This invitation was sent to a different email address.", 403);
      }

      if (parsed.data.decision === "accept") {
        const conflict = await tx.couple.findFirst({
          where: {
            id: { not: invitation.id },
            status: { in: [CoupleStatus.PENDING, CoupleStatus.ACTIVE] },
            OR: [
              { partnerAId: { in: [invitation.partnerAId, user.id] } },
              { partnerBId: { in: [invitation.partnerAId, user.id] } },
              {
                inviteeEmail: { equals: verifiedEmail, mode: "insensitive" },
                invitationStatus: CoupleInvitationStatus.PENDING,
                invitationExpiresAt: { gt: new Date() },
              },
            ],
          },
          select: { id: true },
        });
        if (conflict) {
          throw new TokenInvitationError(
            "One of these users already has a pending or active relationship.",
            409,
          );
        }
      }

      return tx.couple.update({
        where: { id: invitation.id },
        data: {
          status: parsed.data.decision === "accept"
            ? CoupleStatus.ACTIVE
            : CoupleStatus.DISSOLVED,
          ...(parsed.data.decision === "accept" ? { partnerBId: user.id } : {}),
          invitationStatus: parsed.data.decision === "accept"
            ? CoupleInvitationStatus.ACCEPTED
            : CoupleInvitationStatus.REJECTED,
          invitationTokenHash: null,
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
