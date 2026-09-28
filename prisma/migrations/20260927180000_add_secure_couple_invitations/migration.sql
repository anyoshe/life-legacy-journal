CREATE TYPE "CoupleInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

CREATE TABLE "couple_invitations" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "CoupleInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couple_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "couple_invitations_tokenHash_key" ON "couple_invitations"("tokenHash");
CREATE INDEX "couple_invitations_senderId_status_idx" ON "couple_invitations"("senderId", "status");
CREATE INDEX "couple_invitations_recipientEmail_status_idx" ON "couple_invitations"("recipientEmail", "status");

ALTER TABLE "couple_invitations"
ADD CONSTRAINT "couple_invitations_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
