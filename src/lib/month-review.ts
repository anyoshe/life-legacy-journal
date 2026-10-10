import { ReviewType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function startOfMonth(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(start: Date) {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
}

export async function getMonthContext(userId: string) {
  const periodStart = startOfMonth();
  const periodEnd = endOfMonth(periodStart);
  const periodEndInclusive = new Date(periodEnd.getTime() + 86400000 - 1);

  const [entryCount, completedGoals, habitLogs, existing, weeklyCount] =
    await Promise.all([
      prisma.entry.count({
        where: {
          userId,
          createdAt: { gte: periodStart, lte: periodEndInclusive },
        },
      }),
      prisma.goal.count({
        where: {
          userId,
          status: "COMPLETED",
          updatedAt: { gte: periodStart },
        },
      }),
      prisma.habitLog.count({
        where: {
          userId,
          date: { gte: periodStart, lte: periodEnd },
          completed: true,
        },
      }),
      prisma.review.findFirst({
        where: {
          userId,
          type: ReviewType.MONTHLY,
          periodStart,
        },
      }),
      prisma.review.count({
        where: {
          userId,
          type: ReviewType.WEEKLY,
          periodStart: { gte: periodStart, lte: periodEnd },
        },
      }),
    ]);

  return {
    periodStart,
    periodEnd,
    stats: {
      journalEntries: entryCount,
      goalsCompleted: completedGoals,
      habitCheckIns: habitLogs,
      weeklyReviews: weeklyCount,
    },
    existingReview: existing,
  };
}
