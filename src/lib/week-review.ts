import {
  GoalStatus,
  ReviewType,
} from "@prisma/client";
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

export type WeekGlance = {
  periodStart: Date;
  periodEnd: Date;
  journal: {
    count: number;
    titles: { id: string; title: string | null; createdAt: Date }[];
  };
  actions: {
    completedThisWeek: number;
    openPending: number;
    completedTitles: { id: string; title: string; goalTitle: string }[];
    pendingTitles: { id: string; title: string; goalTitle: string }[];
  };
  todos: {
    completed: number;
    pending: number;
    pendingItems: { id: string; title: string; timeOfDay: string | null; date: Date }[];
  };
  habits: {
    checkIns: number;
    activeHabits: number;
    weeklyTargetSum: number;
    byHabit: {
      id: string;
      title: string;
      targetPerWeek: number;
      checkIns: number;
    }[];
  };
  goals: {
    active: number;
    needsAttention: number;
    completedThisWeek: number;
    needsAttentionList: { id: string; title: string; status: string }[];
  };
  legacy: {
    lessons: number;
    experiences: number;
    letters: number;
  };
  stats: {
    journalEntries: number;
    goalsCompleted: number;
    habitCheckIns: number;
  };
  existingReview: Awaited<ReturnType<typeof prisma.review.findFirst>>;
};

/**
 * Non-AI weekly glance: counts and lists from the user's own data only.
 */
export async function getWeekContext(userId: string): Promise<WeekGlance> {
  const periodStart = startOfWeek();
  const periodEnd = endOfWeek(periodStart);
  const periodEndInclusive = new Date(periodEnd.getTime() + 86400000 - 1);

  const [
    entries,
    actionLogs,
    openActions,
    weekTodos,
    habits,
    activeGoals,
    attentionGoals,
    completedGoalsWeek,
    lessonsCount,
    experiencesCount,
    lettersCount,
    existing,
  ] = await Promise.all([
    prisma.entry.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEndInclusive },
      },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.actionLog.findMany({
      where: {
        userId,
        completed: true,
        date: { gte: periodStart, lte: periodEnd },
      },
      include: {
        action: {
          select: {
            id: true,
            title: true,
            goal: { select: { title: true } },
          },
        },
      },
      take: 50,
    }),
    prisma.action.findMany({
      where: {
        completed: false,
        goal: { userId, status: { not: GoalStatus.ARCHIVED } },
      },
      select: {
        id: true,
        title: true,
        goal: { select: { title: true } },
      },
      take: 30,
    }),
    prisma.todo.findMany({
      where: {
        userId,
        date: { gte: periodStart, lte: periodEnd },
      },
      orderBy: [{ date: "asc" }, { timeOfDay: "asc" }],
    }),
    prisma.habit.findMany({
      where: { userId, isActive: true },
      include: {
        logs: {
          where: {
            completed: true,
            date: { gte: periodStart, lte: periodEnd },
          },
        },
      },
    }),
    prisma.goal.count({
      where: {
        userId,
        status: {
          in: [
            GoalStatus.ACTIVE,
            GoalStatus.ON_TRACK,
            GoalStatus.NEEDS_ATTENTION,
            GoalStatus.BEHIND,
          ],
        },
      },
    }),
    prisma.goal.findMany({
      where: {
        userId,
        status: {
          in: [GoalStatus.NEEDS_ATTENTION, GoalStatus.BEHIND],
        },
      },
      select: { id: true, title: true, status: true },
      take: 15,
    }),
    prisma.goal.count({
      where: {
        userId,
        status: GoalStatus.COMPLETED,
        updatedAt: { gte: periodStart, lte: periodEndInclusive },
      },
    }),
    prisma.lesson.count({
      where: { userId, createdAt: { gte: periodStart, lte: periodEndInclusive } },
    }),
    prisma.experience.count({
      where: { userId, date: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.letter.count({
      where: { userId, createdAt: { gte: periodStart, lte: periodEndInclusive } },
    }),
    prisma.review.findFirst({
      where: {
        userId,
        type: ReviewType.WEEKLY,
        periodStart,
      },
    }),
  ]);

  const todosCompleted = weekTodos.filter((t) => t.completed).length;
  const todosPending = weekTodos.filter((t) => !t.completed);
  const habitCheckIns = habits.reduce((n, h) => n + h.logs.length, 0);
  const weeklyTargetSum = habits.reduce((n, h) => n + h.targetPerWeek, 0);

  return {
    periodStart,
    periodEnd,
    journal: {
      count: entries.length,
      titles: entries,
    },
    actions: {
      completedThisWeek: actionLogs.length,
      openPending: openActions.length,
      completedTitles: actionLogs.map((l) => ({
        id: l.action.id,
        title: l.action.title,
        goalTitle: l.action.goal.title,
      })),
      pendingTitles: openActions.map((a) => ({
        id: a.id,
        title: a.title,
        goalTitle: a.goal.title,
      })),
    },
    todos: {
      completed: todosCompleted,
      pending: todosPending.length,
      pendingItems: todosPending.map((t) => ({
        id: t.id,
        title: t.title,
        timeOfDay: t.timeOfDay,
        date: t.date,
      })),
    },
    habits: {
      checkIns: habitCheckIns,
      activeHabits: habits.length,
      weeklyTargetSum,
      byHabit: habits.map((h) => ({
        id: h.id,
        title: h.title,
        targetPerWeek: h.targetPerWeek,
        checkIns: h.logs.length,
      })),
    },
    goals: {
      active: activeGoals,
      needsAttention: attentionGoals.length,
      completedThisWeek: completedGoalsWeek,
      needsAttentionList: attentionGoals.map((g) => ({
        id: g.id,
        title: g.title,
        status: g.status,
      })),
    },
    legacy: {
      lessons: lessonsCount,
      experiences: experiencesCount,
      letters: lettersCount,
    },
    stats: {
      journalEntries: entries.length,
      goalsCompleted: completedGoalsWeek,
      habitCheckIns,
    },
    existingReview: existing,
  };
}
