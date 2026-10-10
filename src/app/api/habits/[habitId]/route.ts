import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ habitId: string }> };

function todayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

const patchSchema = z
  .object({
    completed: z.boolean().optional(),
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    targetPerWeek: z.number().int().min(1).max(14).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId } = await params;
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: user.id },
  });
  if (!habit) return NextResponse.json({ error: "Habit not found." }, { status: 404 });

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
  const today = todayDateOnly();

  if (data.completed !== undefined) {
    if (data.completed) {
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: habit.id, date: today } },
        create: {
          habitId: habit.id,
          userId: user.id,
          date: today,
          completed: true,
        },
        update: { completed: true },
      });

      // If linked to a goal, nudge frequency-style progress
      if (habit.goalId) {
        const goal = await prisma.goal.findFirst({
          where: { id: habit.goalId, userId: user.id },
        });
        if (goal) {
          const current = goal.currentValue ?? 0;
          await prisma.goal.update({
            where: { id: goal.id },
            data: {
              currentValue: current + 1,
              lastReviewedAt: new Date(),
            },
          });
        }
      }
    } else {
      await prisma.habitLog.deleteMany({
        where: { habitId: habit.id, date: today },
      });
      if (habit.goalId) {
        const goal = await prisma.goal.findFirst({
          where: { id: habit.goalId, userId: user.id },
        });
        if (goal) {
          const current = goal.currentValue ?? 0;
          await prisma.goal.update({
            where: { id: goal.id },
            data: {
              currentValue: Math.max(0, current - 1),
              lastReviewedAt: new Date(),
            },
          });
        }
      }
    }
  }

  const meta: Record<string, unknown> = {};
  if (data.title !== undefined) meta.title = data.title;
  if (data.description !== undefined) meta.description = data.description;
  if (data.targetPerWeek !== undefined) meta.targetPerWeek = data.targetPerWeek;
  if (data.isActive !== undefined) meta.isActive = data.isActive;
  if (Object.keys(meta).length > 0) {
    await prisma.habit.update({ where: { id: habit.id }, data: meta });
  }

  const updated = await prisma.habit.findFirst({
    where: { id: habit.id },
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
