-- CreateEnum
CREATE TYPE "GoalAlignment" AS ENUM ('NONE', 'VISION', 'MISSION', 'VISION_AND_MISSION');

-- AlterTable
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "alignment" "GoalAlignment" NOT NULL DEFAULT 'NONE';
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "alignmentNote" TEXT;
