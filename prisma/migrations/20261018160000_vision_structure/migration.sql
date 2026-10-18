-- Structured vision hierarchy (headline, pillars, quote). Statement stays in "vision".
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "visionHeadline" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "visionPillars" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "visionQuote" TEXT;
