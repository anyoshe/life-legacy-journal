CREATE TYPE "CoupleInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

ALTER TABLE "couples"
ADD COLUMN "inviteeEmail" TEXT,
ADD COLUMN "invitationTokenHash" TEXT,
ADD COLUMN "invitationExpiresAt" TIMESTAMP(3),
ADD COLUMN "invitationStatus" "CoupleInvitationStatus";

CREATE UNIQUE INDEX "couples_invitationTokenHash_key" ON "couples"("invitationTokenHash");
CREATE INDEX "couples_inviteeEmail_invitationStatus_idx" ON "couples"("inviteeEmail", "invitationStatus");
