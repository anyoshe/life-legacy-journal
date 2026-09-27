-- Add an immutable Clerk identity without changing existing user records.
ALTER TABLE "users" ADD COLUMN "clerkId" TEXT;
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- Make new records compatible with the existing required array fields.
ALTER TABLE "users" ALTER COLUMN "coreValues" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ALTER COLUMN "personalRules" SET DEFAULT ARRAY[]::TEXT[];
