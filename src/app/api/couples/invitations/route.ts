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

  const [incoming, outgoing, relationship] = await Promise.all([
    prisma.couple.findMany({
      where: {
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
      select: {
        id: true,
        partnerBId: true,
        inviteeEmail: true,
        invitationStatus: true,
        invitationExpiresAt: true,
        createdAt: true,
        partnerA: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.couple.findMany({
      where: {
        partnerAId: user.id,
        status: CoupleStatus.PENDING,
        invitationStatus: CoupleInvitationStatus.PENDING,
        invitationExpiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        inviteeEmail: true,
        invitationExpiresAt: true,
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
        partnerBId: true,
        partnerA: { select: { name: true, email: true } },
        partnerB: { select: { name: true, email: true } },
      },
    }),
  ]);

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

      const pendingFromSender = await tx.couple.findFirst({
        where: {
          partnerAId: senderId,
          status: CoupleStatus.PENDING,
          OR: [
            { inviteeEmail: { equals: email, mode: "insensitive" } },
            ...(invitee ? [{ partnerBId: invitee.id }] : []),
          ],
        },
        select: { id: true },
      });

      if (pendingFromSender) {
        return tx.couple.update({
          where: { id: pendingFromSender.id },
          data: {
            inviteeEmail: email,
            invitationTokenHash: tokenHash,
            invitationExpiresAt: expiresAt,
            invitationStatus: CoupleInvitationStatus.PENDING,
          },
          select: { id: true },
        });
      }

      const conflictClauses: Prisma.CoupleWhereInput[] = [
        { partnerAId: senderId },
        { partnerBId: senderId },
        { inviteeEmail: { equals: email, mode: "insensitive" } },
      ];
      if (invitee) {
        conflictClauses.push(
          { partnerAId: invitee.id },
          { partnerBId: invitee.id },
        );
      }

      const existingRelationship = await tx.couple.findFirst({
        where: {
          OR: [
            { status: CoupleStatus.ACTIVE, OR: conflictClauses },
            {
              status: CoupleStatus.PENDING,
              AND: [
                { OR: conflictClauses },
                {
                  OR: [
                    { invitationStatus: null },
                    {
                      invitationStatus: CoupleInvitationStatus.PENDING,
                      invitationExpiresAt: { gt: new Date() },
                    },
                  ],
                },
              ],
            },
          ],
        },
        select: { id: true },
      });
      if (!invitee || invitee.id === senderId || existingRelationship) return null;

      return tx.couple.create({
        data: {
          partnerAId: senderId,
          inviteeEmail: email,
          invitationTokenHash: tokenHash,
          invitationExpiresAt: expiresAt,
          invitationStatus: CoupleInvitationStatus.PENDING,
          status: CoupleStatus.PENDING,
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
          await prisma.couple.updateMany({
            where: {
              id: invitation.id,
              invitationTokenHash: tokenHash,
              invitationStatus: CoupleInvitationStatus.PENDING,
            },
            data: {
              invitationStatus: CoupleInvitationStatus.EXPIRED,
              invitationExpiresAt: new Date(),
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
