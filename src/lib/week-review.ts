import { ReviewType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function startOfWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

export function endOfWeek(start: Date) {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return end;
}

export async function getWeekContext(userId: string) {
  const periodStart = startOfWeek();
  const periodEnd = endOfWeek(periodStart);
  const periodEndInclusive = new Date(periodEnd.getTime() + 86400000 - 1);

  const [entryCount, completedGoals, habitLogs, existing] = await Promise.all([
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
        type: ReviewType.WEEKLY,
        periodStart,
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
    },
    existingReview: existing,
  };
}
