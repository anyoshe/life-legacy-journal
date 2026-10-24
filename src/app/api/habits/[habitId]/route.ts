import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calendarDateOnly } from "@/lib/dates";
import {
  applyHabitContribution,
  rollupParentFromChildren,
  unitsPerHabitCheckIn,
} from "@/lib/habit-goal-contribution";

type RouteContext = { params: Promise<{ habitId: string }> };

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    targetPerWeek: z.number().int().min(1).max(14).optional(),
    isActive: z.boolean().optional(),
    completed: z.boolean().optional(),
    goalId: z.string().min(1).nullable().optional(),
    contributionRole: z.enum(["KEY", "SUPPORTING"]).optional(),
  })
  .strict();

async function rollupParentGoal(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  goalId: string,
  userId: string,
) {
  const goal = await tx.goal.findFirst({
    where: { id: goalId, userId },
    select: { parentGoalId: true },
  });
  if (!goal?.parentGoalId) return;

  const siblings = await tx.goal.findMany({
    where: {
      parentGoalId: goal.parentGoalId,
      userId,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
    select: { currentValue: true, targetValue: true },
  });
  const rolled = rollupParentFromChildren(siblings);
  const parent = await tx.goal.findFirst({
    where: { id: goal.parentGoalId, userId },
  });
  if (!parent) return;

  const target = parent.targetValue ?? rolled.targetValue;
  const current = rolled.currentValue;
  const completed =
    target != null && target > 0 ? current >= target - 1e-9 : false;

  await tx.goal.update({
    where: { id: parent.id },
    data: {
      currentValue: current,
      lastReviewedAt: new Date(),
      ...(completed
        ? { status: "COMPLETED" as const }
        : parent.status === "COMPLETED"
          ? { status: "ACTIVE" as const }
          : {}),
    },
  });
}

async function toggleHabitIdempotent(options: {
  habitId: string;
  userId: string;
  completed: boolean;
}) {
  const { habitId, userId, completed } = options;
  const today = calendarDateOnly();

  return prisma.$transaction(async (tx) => {
    const habit = await tx.habit.findFirst({
      where: { id: habitId, userId },
    });
    if (!habit) return { error: "Habit not found." as const, status: 404 as const };

    const existing = await tx.habitLog.findUnique({
      where: { habitId_date: { habitId: habit.id, date: today } },
    });

    let transition: "complete" | "undo" | "noop" = "noop";

    if (completed) {
      if (existing?.completed) {
        transition = "noop";
      } else if (existing && !existing.completed) {
        await tx.habitLog.update({
          where: { id: existing.id },
          data: { completed: true },
        });
        transition = "complete";
      } else {
        await tx.habitLog.create({
          data: {
            habitId: habit.id,
            userId,
            date: today,
            completed: true,
          },
        });
        transition = "complete";
      }
    } else {
      if (!existing?.completed) {
        transition = "noop";
        if (existing) {
          await tx.habitLog.delete({ where: { id: existing.id } });
        }
      } else {
        await tx.habitLog.delete({ where: { id: existing.id } });
        transition = "undo";
      }
    }

    if (transition !== "noop" && habit.goalId) {
      const goal = await tx.goal.findFirst({
        where: { id: habit.goalId, userId },
      });
      if (goal) {
        const linked = await tx.habit.findMany({
          where: {
            goalId: goal.id,
            userId,
            isActive: true,
          },
          select: { contributionRole: true },
        });
        const keyCount = linked.filter((h) => h.contributionRole === "KEY").length;
        const supportingCount = linked.filter(
          (h) => h.contributionRole !== "KEY",
        ).length;

        const role =
          (habit as { contributionRole?: string }).contributionRole ??
          "SUPPORTING";
        const delta = unitsPerHabitCheckIn(
          {
            targetPerWeek: habit.targetPerWeek,
            contributionRole: role,
          },
          {
            type: goal.type,
            targetValue: goal.targetValue,
            currentValue: goal.currentValue,
            frequencyTarget: goal.frequencyTarget,
            deadline: goal.deadline,
          },
          new Date(),
          { keyCount: Math.max(1, keyCount), supportingCount: Math.max(1, supportingCount) },
        );
        const applied = applyHabitContribution({
          currentValue: goal.currentValue,
          targetValue: goal.targetValue,
          delta,
          completing: transition === "complete",
        });
        await tx.goal.update({
          where: { id: goal.id },
          data: {
            currentValue: applied.currentValue,
            lastReviewedAt: new Date(),
            ...(applied.completed
              ? { status: "COMPLETED" as const }
              : goal.status === "COMPLETED"
                ? { status: "ACTIVE" as const }
                : {}),
          },
        });
        await rollupParentGoal(tx, goal.id, userId);
      }
    }

    return { transition, habit };
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const data = parsed.data;
  const today = calendarDateOnly();

  if (data.completed !== undefined) {
    const result = await toggleHabitIdempotent({
      habitId,
      userId: user.id,
      completed: data.completed,
    });
    if ("error" in result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 404 },
      );
    }
  }

  const habitExists = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id },
  });
  if (!habitExists) {
    return NextResponse.json({ error: "Habit not found." }, { status: 404 });
  }

  if (data.goalId) {
    const g = await prisma.goal.findFirst({
      where: { id: data.goalId, userId: user.id },
    });
    if (!g) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }
  }

  const meta: Record<string, unknown> = {};
  if (data.title !== undefined) meta.title = data.title;
  if (data.description !== undefined) meta.description = data.description;
  if (data.targetPerWeek !== undefined) meta.targetPerWeek = data.targetPerWeek;
  if (data.isActive !== undefined) meta.isActive = data.isActive;
  if (data.goalId !== undefined) meta.goalId = data.goalId;
  if (data.contributionRole !== undefined) {
    meta.contributionRole = data.contributionRole;
  }
  if (Object.keys(meta).length > 0) {
    await prisma.habit.update({ where: { id: habitId }, data: meta });
  }

  const updated = await prisma.habit.findFirst({
    where: { id: habitId },
    include: {
      logs: { where: { date: today }, take: 1 },
      goal: { select: { id: true, title: true, area: true, type: true } },
    },
  });

  return NextResponse.json({
    habit: updated
      ? {
          id: updated.id,
          title: updated.title,
          description: updated.description,
          targetPerWeek: updated.targetPerWeek,
          goalId: updated.goalId,
          goal: updated.goal,
          contributionRole:
            (updated as { contributionRole?: string }).contributionRole ??
            "SUPPORTING",
          doneToday: updated.logs[0]?.completed ?? false,
          isActive: updated.isActive,
        }
      : null,
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId } = await params;
  const deleted = await prisma.habit.deleteMany({
    where: { id: habitId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Habit not found." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
