import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { calendarDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ habitId: string }> };

const patchSchema = z
  .object({
    completed: z.boolean().optional(),
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    targetPerWeek: z.number().int().min(1).max(14).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

/**
 * Idempotent habit check-in:
 * - Completing when a completed log already exists for the date → no progress change
 * - Completing when no log → create log + contribute once
 * - Undo when completed log exists → delete log + reverse once
 * - Undo when no completed log → no progress change
 */
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
        const current = goal.currentValue ?? 0;
        const next =
          transition === "complete"
            ? current + 1
            : Math.max(0, current - 1);
        await tx.goal.update({
          where: { id: goal.id },
          data: {
            currentValue: next,
            lastReviewedAt: new Date(),
          },
        });
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

  const meta: Record<string, unknown> = {};
  if (data.title !== undefined) meta.title = data.title;
  if (data.description !== undefined) meta.description = data.description;
  if (data.targetPerWeek !== undefined) meta.targetPerWeek = data.targetPerWeek;
  if (data.isActive !== undefined) meta.isActive = data.isActive;
  if (Object.keys(meta).length > 0) {
    await prisma.habit.update({ where: { id: habitId }, data: meta });
  }

  const updated = await prisma.habit.findFirst({
    where: { id: habitId },
    include: {
      logs: { where: { date: today }, take: 1 },
      goal: { select: { id: true, title: true, area: true } },
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
