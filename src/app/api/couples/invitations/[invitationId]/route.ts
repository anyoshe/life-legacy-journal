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
      const emailInvitation = await tx.coupleInvitation.findFirst({
        where: {
          id: invitationId,
          recipientEmail: { equals: verifiedEmail, mode: "insensitive" },
          status: CoupleInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, senderId: true, recipientEmail: true, sender: { select: { email: true } } },
      });

      if (emailInvitation) {
        if (parsed.data.decision === "accept") {
          const existingCouple = await tx.couple.findFirst({
            where: {
              OR: [
                { partnerAId: { in: [emailInvitation.senderId, user.id] } },
                { partnerBId: { in: [emailInvitation.senderId, user.id] } },
              ],
            },
            select: { id: true },
          });
          if (existingCouple) {
            throw new InvitationResponseError(
              "One of these users already has a couple relationship record.",
              409,
            );
          }

          const otherPendingInvitation = await tx.coupleInvitation.findFirst({
            where: {
              id: { not: emailInvitation.id },
              status: CoupleInvitationStatus.PENDING,
              expiresAt: { gt: new Date() },
              OR: [
                { senderId: { in: [emailInvitation.senderId, user.id] } },
                { recipientEmail: { equals: emailInvitation.recipientEmail, mode: "insensitive" } },
                { recipientEmail: { equals: emailInvitation.sender.email, mode: "insensitive" } },
              ],
            },
            select: { id: true },
          });
          if (otherPendingInvitation) {
            throw new InvitationResponseError(
              "One of these users already has another pending invitation.",
              409,
            );
          }

          await tx.couple.create({
            data: {
              partnerAId: emailInvitation.senderId,
              partnerBId: user.id,
              status: CoupleStatus.ACTIVE,
            },
            select: { id: true },
          });
        }

        return tx.coupleInvitation.update({
          where: { id: emailInvitation.id },
          data: {
            status: parsed.data.decision === "accept"
              ? CoupleInvitationStatus.ACCEPTED
              : CoupleInvitationStatus.REJECTED,
            tokenHash: null,
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        });
      }

      const pendingInvitation = await tx.couple.findFirst({
        where: {
          id: invitationId,
          status: CoupleStatus.PENDING,
          partnerBId: user.id,
        },
        select: { id: true, partnerAId: true, partnerBId: true },
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
