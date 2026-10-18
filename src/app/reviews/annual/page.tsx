import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewType, GoalStatus } from "@prisma/client";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnnualReviewForm } from "./AnnualReviewForm";
import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";

export default async function AnnualReviewPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const year = new Date().getFullYear();
  const periodStart = new Date(Date.UTC(year, 0, 1));
  const periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const [entryCount, completedGoals, reviews, existing] = await Promise.all([
    prisma.entry.count({
      where: {
        userId: user.id,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.goal.count({
      where: {
        userId: user.id,
        status: GoalStatus.COMPLETED,
        updatedAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.review.count({
      where: {
        userId: user.id,
        type: { in: [ReviewType.WEEKLY, ReviewType.MONTHLY] },
        periodStart: { gte: periodStart },
      },
    }),
    prisma.review.findFirst({
      where: {
        userId: user.id,
        type: ReviewType.ANNUAL,
        periodStart,
      },
    }),
  ]);

  const content =
    existing?.content && typeof existing.content === "object"
      ? (existing.content as Record<string, unknown>)
      : {};

  return (
    <AppShell rightSlot={<UserButton />}>
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/reviews" className="text-sm font-medium text-primary">
          ← Reviews
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text)]">
          Annual review · {year}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Look back on the year with your own words. Stats below are from your
          journal and goals — not AI-generated.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-semibold text-primary">{entryCount}</p>
            <p className="text-xs text-secondary">Entries</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-semibold text-primary">{completedGoals}</p>
            <p className="text-xs text-secondary">Goals completed</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-semibold text-primary">{reviews}</p>
            <p className="text-xs text-secondary">Weekly/monthly reviews</p>
          </div>
        </div>

        <div className="mt-8">
          <AnnualReviewForm
            year={year}
            periodStart={periodStart.toISOString()}
            periodEnd={periodEnd.toISOString()}
            initial={{
              wins: String(content.wins ?? ""),
              challenges: String(content.challenges ?? ""),
              lessons: String(content.lessons ?? ""),
              relationships: String(content.relationships ?? ""),
              growth: String(content.growth ?? ""),
              gratitude: String(content.gratitude ?? ""),
              nextYearFocus: String(content.nextYearFocus ?? ""),
              legacyNote: String(content.legacyNote ?? ""),
            }}
          />
        </div>
      </main>
    </div>
    </AppShell>
  );
}
