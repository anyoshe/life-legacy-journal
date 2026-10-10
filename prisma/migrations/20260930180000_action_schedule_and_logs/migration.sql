-- Action scheduling + completion logs (additive, safe)

CREATE TYPE "ActionRecurrence" AS ENUM ('ONCE', 'DAILY', 'WEEKDAYS', 'WEEKLY', 'CUSTOM_DAYS');

ALTER TABLE "actions"
  ADD COLUMN IF NOT EXISTS "recurrence" "ActionRecurrence" NOT NULL DEFAULT 'ONCE',
  ADD COLUMN IF NOT EXISTS "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN IF NOT EXISTS "timeOfDay" TEXT,
  ADD COLUMN IF NOT EXISTS "contributionValue" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "action_logs" (
  "id" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "action_logs_actionId_date_key" ON "action_logs"("actionId", "date");
CREATE INDEX IF NOT EXISTS "action_logs_userId_date_idx" ON "action_logs"("userId", "date");

ALTER TABLE "action_logs"
  ADD CONSTRAINT "action_logs_actionId_fkey"
  FOREIGN KEY ("actionId") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "action_logs"
  ADD CONSTRAINT "action_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
