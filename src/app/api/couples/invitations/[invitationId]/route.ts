import { CoupleInvitationStatus, CoupleStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser, getCurrentVerifiedEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const responseSchema = z.object({
  decision: z.enum(["accept", "reject"]),
}).strict();

class InvitationResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isPrismaConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
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

  const { invitationId } = await params;
  try {
    const invitation = await prisma.$transaction(async (tx) => {
      const pendingInvitation = await tx.couple.findFirst({
        where: {
          id: invitationId,
          status: CoupleStatus.PENDING,
          OR: [
            { partnerBId: user.id, invitationStatus: null },
            {
              inviteeEmail: { equals: verifiedEmail, mode: "insensitive" },
              invitationStatus: CoupleInvitationStatus.PENDING,
              invitationExpiresAt: { gt: new Date() },
            },
          ],
        },
        select: { id: true, partnerAId: true, partnerBId: true, invitationStatus: true },
      });
      if (!pendingInvitation) {
        throw new InvitationResponseError("Invitation not found.", 404);
      }

      if (parsed.data.decision === "accept") {
        const conflictingRelationship = await tx.couple.findFirst({
          where: {
            id: { not: pendingInvitation.id },
            status: { in: [CoupleStatus.PENDING, CoupleStatus.ACTIVE] },
            OR: [
              { partnerAId: { in: [pendingInvitation.partnerAId, user.id] } },
              { partnerBId: { in: [pendingInvitation.partnerAId, user.id] } },
            ],
          },
          select: { id: true },
        });
        if (conflictingRelationship) {
          throw new InvitationResponseError("One of these users already has a pending or active relationship.", 409);
        }
      }

      return tx.couple.update({
        where: { id: pendingInvitation.id },
        data: {
          status: parsed.data.decision === "accept"
            ? CoupleStatus.ACTIVE
            : CoupleStatus.DISSOLVED,
          ...(pendingInvitation.invitationStatus
            ? {
                partnerBId: parsed.data.decision === "accept" ? user.id : null,
                invitationStatus: parsed.data.decision === "accept"
                  ? CoupleInvitationStatus.ACCEPTED
                  : CoupleInvitationStatus.REJECTED,
                invitationTokenHash: null,
              }
            : {}),
        },
        select: { id: true, status: true, createdAt: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ invitation });
  } catch (error) {
    if (error instanceof InvitationResponseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isPrismaConflict(error)) {
      return NextResponse.json({ error: "A relationship or invitation already exists." }, { status: 409 });
    }
    console.error("Failed to respond to couple invitation:", error);
    return NextResponse.json({ error: "Failed to respond to invitation." }, { status: 500 });
  }
}
