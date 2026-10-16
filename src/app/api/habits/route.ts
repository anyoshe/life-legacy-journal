import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeHabitStreaks } from "@/lib/habit-streaks";
import { calendarDateOnly } from "@/lib/dates";

function todayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional().nullable(),
    targetPerWeek: z.number().int().min(1).max(14).optional(),
    goalId: z.string().min(1).optional().nullable(),
  })
  .strict();

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = todayDateOnly();
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      logs: {
        where: { completed: true },
        orderBy: { date: "desc" },
        take: 120,
        select: { date: true, completed: true },
      },
      goal: { select: { id: true, title: true, area: true } },
    },
  });

  return NextResponse.json({
    habits: habits.map((h) => {
      const streaks = computeHabitStreaks(
        h.logs.filter((l) => l.completed).map((l) => l.date),
        today,
      );
      const doneToday = h.logs.some((l) => {
        const d = l.date;
        return (
          l.completed &&
          d.getUTCFullYear() === today.getUTCFullYear() &&
          d.getUTCMonth() === today.getUTCMonth() &&
          d.getUTCDate() === today.getUTCDate()
        );
      });
      return {
        id: h.id,
        title: h.title,
        description: h.description,
        targetPerWeek: h.targetPerWeek,
        goalId: h.goalId,
        goal: h.goal,
        doneToday,
        currentStreak: streaks.current,
        bestStreak: streaks.best,
        createdAt: h.createdAt,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid habit details." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a habit title." }, { status: 400 });
  }

  const data = parsed.data;
  if (data.goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: data.goalId, userId: user.id },
    });
    if (!goal) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }
  }

  const habit = await prisma.habit.create({
    data: {
      userId: user.id,
      title: data.title,
      description: data.description || null,
      targetPerWeek: data.targetPerWeek ?? 7,
      goalId: data.goalId || null,
    },
    include: { goal: { select: { id: true, title: true, area: true } } },
  });

  return NextResponse.json(
    {
      habit: {
        ...habit,
        doneToday: false,
      },
    },
    { status: 201 },
  );
}
