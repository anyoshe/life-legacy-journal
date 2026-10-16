-- AlterTable Entry: optional goal link
ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "goalId" TEXT;
CREATE INDEX IF NOT EXISTS "entries_goalId_idx" ON "entries"("goalId");
DO $$ BEGIN
  ALTER TABLE "entries" ADD CONSTRAINT "entries_goalId_fkey"
    FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable todos
CREATE TABLE IF NOT EXISTS "todos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "date" DATE NOT NULL,
    "timeOfDay" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "todos_userId_date_idx" ON "todos"("userId", "date");
CREATE INDEX IF NOT EXISTS "todos_userId_date_completed_idx" ON "todos"("userId", "date", "completed");

DO $$ BEGIN
  ALTER TABLE "todos" ADD CONSTRAINT "todos_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "todos" ADD CONSTRAINT "todos_goalId_fkey"
    FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
