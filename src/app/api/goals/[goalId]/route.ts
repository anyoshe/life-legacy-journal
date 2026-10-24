import { NextRequest, NextResponse } from "next/server";
import {
  ActionRecurrence,
  GoalAlignment,
  GoalHorizon,
  GoalStatus,
} from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { applyActionContribution, refreshMilestoneProgress } from "@/lib/goal-progress";
import { prisma } from "@/lib/prisma";
import {
  isPeriodRecurring,
  logMatchesPeriod,
  periodKeyDate,
} from "@/lib/action-period";

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    why: z.string().trim().max(2000).nullable().optional(),
    currentValue: z.number().finite().nonnegative().optional(),
    targetValue: z.number().finite().nonnegative().nullable().optional(),
    unit: z.string().trim().max(40).nullable().optional(),
    frequencyTarget: z.number().int().positive().nullable().optional(),
    status: z.nativeEnum(GoalStatus).optional(),
    deadline: z.string().datetime().nullable().optional(),
    milestoneId: z.string().min(1).optional(),
    actionId: z.string().min(1).optional(),
    completed: z.boolean().optional(),
    addMilestone: z
      .object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional(),
        targetDate: z.string().datetime().optional().nullable(),
      })
      .optional(),
    /** Update target date on an existing milestone */
    milestoneTargetDate: z
      .object({
        milestoneId: z.string().min(1),
        targetDate: z.string().datetime().nullable(),
      })
      .optional(),
    addAction: z
      .object({
        title: z.string().trim().min(1).max(200),
        dueDate: z.string().datetime().optional(),
        notes: z.string().trim().max(2000).optional(),
        recurrence: z
          .enum([
            "ONCE",
            "DAILY",
            "WEEKDAYS",
            "WEEKLY",
            "MONTHLY",
            "QUARTERLY",
            "YEARLY",
            "CUSTOM_DAYS",
          ])
          .optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
        timeOfDay: z
          .string()
          .optional()
          .nullable(),
        contributionValue: z.number().finite().nonnegative().optional().nullable(),
      })
      .optional(),
    deleteMilestoneId: z.string().min(1).optional(),
    deleteActionId: z.string().min(1).optional(),
    alignment: z.nativeEnum(GoalAlignment).optional(),
    alignmentNote: z.string().trim().max(4000).nullable().optional(),
    horizon: z.nativeEnum(GoalHorizon).nullable().optional(),
    parentGoalId: z.string().min(1).nullable().optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ goalId: string }> };

function todayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

async function loadGoal(goalId: string, userId: string) {
  return prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      milestones: { orderBy: { order: "asc" } },
      actions: {
        orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
        include: {
          logs: {
            orderBy: { date: "desc" },
            take: 60,
          },
        },
      },
    },
  });
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goalId } = await params;
  const goal = await loadGoal(goalId, user.id);
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const actions = goal.actions.map((action) => {
    const isRecurring = isPeriodRecurring(action.recurrence);
    const doneToday = isRecurring
      ? action.logs.some(
          (l) => l.completed && logMatchesPeriod(l.date, action.recurrence),
        )
      : action.completed;
    return { ...action, doneToday, logs: undefined };
  });

  return NextResponse.json({ goal: { ...goal, actions, canEdit: true } });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goalId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid goal update." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid goal update.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id } });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const data = parsed.data;

  if (data.deleteMilestoneId) {
    const deleted = await prisma.milestone.deleteMany({
      where: { id: data.deleteMilestoneId, goalId },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    }
    await refreshMilestoneProgress(goalId);
  }

  if (data.deleteActionId) {
    const deleted = await prisma.action.deleteMany({
      where: { id: data.deleteActionId, goalId },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Action not found." }, { status: 404 });
    }
  }

  if (data.milestoneId) {
    const milestone = await prisma.milestone.findFirst({
      where: { id: data.milestoneId, goalId },
    });
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    }
    const completed = data.completed ?? !milestone.completed;
    await prisma.milestone.update({
      where: { id: milestone.id },
      data: { completed, completedAt: completed ? new Date() : null },
    });
    await refreshMilestoneProgress(goalId);
  }

  if (data.actionId) {
    const action = await prisma.action.findFirst({
      where: { id: data.actionId, goalId },
    });
    if (!action) {
      return NextResponse.json({ error: "Action not found." }, { status: 404 });
    }

    const isRecurring = isPeriodRecurring(action.recurrence);

    if (isRecurring) {
      const date = periodKeyDate(action.recurrence);
      const completing = data.completed ?? true;
      if (completing) {
        await prisma.actionLog.upsert({
          where: { actionId_date: { actionId: action.id, date } },
          create: { actionId: action.id, userId: user.id, date, completed: true },
          update: { completed: true },
        });
        await applyActionContribution({
          goal,
          contributionValue: action.contributionValue,
          completing: true,
        });
      } else {
        await prisma.actionLog.deleteMany({ where: { actionId: action.id, date } });
        await applyActionContribution({
          goal,
          contributionValue: action.contributionValue,
          completing: false,
        });
      }
    } else {
      const wasCompleted = action.completed;
      const nowCompleted = data.completed ?? !action.completed;
      await prisma.action.update({
        where: { id: action.id },
        data: {
          completed: nowCompleted,
          completedAt: nowCompleted ? new Date() : null,
        },
      });
      if (wasCompleted !== nowCompleted) {
        await applyActionContribution({
          goal,
          contributionValue: action.contributionValue,
          completing: nowCompleted,
        });
      }
    }
  }

  if (data.addMilestone) {
    const maxOrder = await prisma.milestone.aggregate({
      where: { goalId },
      _max: { order: true },
    });
    await prisma.milestone.create({
      data: {
        goalId,
        title: data.addMilestone.title,
        description: data.addMilestone.description || null,
        targetDate: data.addMilestone.targetDate
          ? new Date(data.addMilestone.targetDate)
          : null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  if (data.milestoneTargetDate) {
    const mid = data.milestoneTargetDate.milestoneId;
    const existing = await prisma.milestone.findFirst({
      where: { id: mid, goalId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    }
    await prisma.milestone.update({
      where: { id: mid },
      data: {
        targetDate: data.milestoneTargetDate.targetDate
          ? new Date(data.milestoneTargetDate.targetDate)
          : null,
      },
    });
  }

  if (data.addAction) {
    const recurrence = (data.addAction.recurrence ?? "ONCE") as ActionRecurrence;
    await prisma.action.create({
      data: {
        goalId,
        title: data.addAction.title,
        notes: data.addAction.notes || null,
        dueDate: data.addAction.dueDate ? new Date(data.addAction.dueDate) : null,
        recurrence,
        daysOfWeek: data.addAction.daysOfWeek ?? [],
        timeOfDay: data.addAction.timeOfDay ? data.addAction.timeOfDay : null,
        contributionValue: data.addAction.contributionValue ?? null,
      },
    });
  }

  const goalUpdate: Record<string, unknown> = {};
  if (data.title !== undefined) goalUpdate.title = data.title;
  if (data.description !== undefined) goalUpdate.description = data.description;
  if (data.why !== undefined) goalUpdate.why = data.why;
  if (data.currentValue !== undefined) goalUpdate.currentValue = data.currentValue;
  if (data.targetValue !== undefined) goalUpdate.targetValue = data.targetValue;
  if (data.unit !== undefined) goalUpdate.unit = data.unit;
  if (data.frequencyTarget !== undefined) goalUpdate.frequencyTarget = data.frequencyTarget;
  if (data.status !== undefined) goalUpdate.status = data.status;
  if (data.deadline !== undefined) {
    goalUpdate.deadline = data.deadline ? new Date(data.deadline) : null;
  }
  if (data.alignment !== undefined) goalUpdate.alignment = data.alignment;
  if (data.alignmentNote !== undefined) goalUpdate.alignmentNote = data.alignmentNote;
  if (data.horizon !== undefined) goalUpdate.horizon = data.horizon;
  if (data.parentGoalId !== undefined) goalUpdate.parentGoalId = data.parentGoalId;

  if (Object.keys(goalUpdate).length > 0) {
    goalUpdate.lastReviewedAt = new Date();
    await prisma.goal.update({ where: { id: goal.id }, data: goalUpdate });
  } else {
    await prisma.goal.update({
      where: { id: goal.id },
      data: { lastReviewedAt: new Date() },
    });
  }

  const updated = await loadGoal(goal.id, user.id);
  if (!updated) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const actions = updated.actions.map((action) => {
    const isRecurring = isPeriodRecurring(action.recurrence);
    const doneToday = isRecurring
      ? action.logs.some(
          (l) => l.completed && logMatchesPeriod(l.date, action.recurrence),
        )
      : action.completed;
    return { ...action, doneToday, logs: undefined };
  });

  return NextResponse.json({ goal: { ...updated, actions, canEdit: true } });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goalId } = await params;
  const deleted = await prisma.goal.deleteMany({
    where: { id: goalId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
