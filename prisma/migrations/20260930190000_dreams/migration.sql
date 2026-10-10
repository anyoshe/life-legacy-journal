CREATE TYPE "DreamKind" AS ENUM ('DAY_INTENTION', 'NIGHT_DREAM');

CREATE TABLE IF NOT EXISTS "dreams" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "DreamKind" NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "feelings" TEXT,
  "meaning" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dreams_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "dreams_userId_date_idx" ON "dreams"("userId", "date");
CREATE INDEX IF NOT EXISTS "dreams_userId_kind_idx" ON "dreams"("userId", "kind");

ALTER TABLE "dreams"
  ADD CONSTRAINT "dreams_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
