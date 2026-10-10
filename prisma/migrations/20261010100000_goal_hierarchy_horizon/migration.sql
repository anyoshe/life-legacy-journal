-- CreateEnum
CREATE TYPE "GoalHorizon" AS ENUM ('LONG_TERM', 'ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY', 'DAILY');

-- AlterTable
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "horizon" "GoalHorizon";

-- Index for parent lookups
CREATE INDEX IF NOT EXISTS "goals_parentGoalId_idx" ON "goals"("parentGoalId");
CREATE INDEX IF NOT EXISTS "goals_userId_parentGoalId_idx" ON "goals"("userId", "parentGoalId");
