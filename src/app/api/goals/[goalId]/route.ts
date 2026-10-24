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
import { ensureFinanceSubgoalsForRoot } from "@/lib/finance-umbrella";

/** Flexible date: full ISO or YYYY-MM-DD */
const dateInput = z
  .union([
    z.string().datetime(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ])
  .optional()
  .nullable();

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (value.includes("T")) return new Date(value);
  return new Date(value + "T12:00:00.000Z");
}

function todayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function periodKeyDate(recurrence: string, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  if (recurrence === "YEARLY") return new Date(Date.UTC(y, 0, 1));
  if (recurrence === "QUARTERLY")
    return new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1));
  if (recurrence === "MONTHLY") return new Date(Date.UTC(y, m, 1));
  if (recurrence === "WEEKLY") {
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    return new Date(Date.UTC(y, m, d + diff));
  }
  return new Date(Date.UTC(y, m, d));
}

function isPeriodRecurring(recurrence: string) {
  return recurrence !== "ONCE";
}

function logMatchesPeriod(logDate: Date, recurrence: string, now = new Date()) {
  const key = periodKeyDate(recurrence, now);
  const ld = new Date(
    Date.UTC(logDate.getUTCFullYear(), logDate.getUTCMonth(), logDate.getUTCDate()),
  );
  return ld.getTime() === key.getTime();
}

const RECURRENCE_VALUES = [
  "ONCE",
  "DAILY",
  "WEEKDAYS",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "CUSTOM_DAYS",
] as const;

const updateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  why: z.string().trim().max(2000).nullable().optional(),
  currentValue: z.number().finite().nonnegative().optional(),
  targetValue: z.number().finite().nonnegative().nullable().optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  frequencyTarget: z.number().int().positive().nullable().optional(),
  status: z.nativeEnum(GoalStatus).optional(),
  deadline: dateInput,
  milestoneId: z.string().min(1).optional(),
  actionId: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  // Milestones: title + optional end date only
  addMilestone: z
    .object({
      title: z.string().trim().min(1), // no max — full notes allowed
      description: z.string().trim().optional(),
      targetDate: dateInput,
    })
    .optional(),
  deleteMilestoneId: z.string().min(1).optional(),
  // Actions
  addAction: z
    .object({
      title: z.string().trim().min(1), // no character limit
      dueDate: dateInput,
      notes: z.string().trim().optional(),
      recurrence: z.enum(RECURRENCE_VALUES).optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
      timeOfDay: z.string().optional().nullable(),
      contributionValue: z.number().finite().nonnegative().optional().nullable(),
    })
    .optional(),
  deleteActionId: z.string().min(1).optional(),
  // Alignment / hierarchy
  alignment: z.nativeEnum(GoalAlignment).optional(),
  alignmentNote: z.string().trim().max(4000).nullable().optional(),
  horizon: z.nativeEnum(GoalHorizon).nullable().optional(),
  parentGoalId: z.string().min(1).nullable().optional(),
});

type RouteContext = { params: Promise<{ goalId: string }> };

async function loadGoal(goalId: string, userId: string) {
  return prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      milestones: { orderBy: { order: "asc" } },
      actions: {
        orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
        include: {
          logs: { orderBy: { date: "desc" }, take: 60 },
        },
      },
      parentGoal: {
        select: {
          id: true,
          title: true,
          horizon: true,
          status: true,
          area: true,
        },
      },
      childGoals: {
        where: { status: { notIn: ["ARCHIVED", "ABANDONED"] } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          horizon: true,
          status: true,
          area: true,
          currentValue: true,
          targetValue: true,
          unit: true,
        },
      },
    },
  });
}

function mapActions(
  actions: Array<{
    recurrence: string;
    completed: boolean;
    logs: Array<{ date: Date; completed: boolean }>;
    [key: string]: unknown;
  }>,
) {
  return actions.map((action) => {
    const isRecurring = isPeriodRecurring(action.recurrence);
    const doneToday = isRecurring
      ? action.logs.some(
          (l) => l.completed && logMatchesPeriod(l.date, action.recurrence),
        )
      : action.completed;
    const { logs: _logs, ...rest } = action;
    return { ...rest, doneToday };
  });
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goalId } = await params;
  let goal = await loadGoal(goalId, user.id);
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  // Financial root: ensure Clear all debts + Build savings appear under Supporting goals
  if (
    goal.area === "FINANCIAL" &&
    !goal.parentGoalId &&
    !(goal as { financePlanId?: string | null }).financePlanId
  ) {
    try {
      await ensureFinanceSubgoalsForRoot(user.id, goal.id);
      const refreshed = await loadGoal(goalId, user.id);
      if (refreshed) goal = refreshed;
    } catch (e) {
      console.error("ensureFinanceSubgoalsForRoot", e);
    }
  }

  return NextResponse.json({
    goal: {
      ...goal!,
      actions: mapActions(goal!.actions as never),
      canEdit: true,
    },
  });
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
      { error: "Invalid goal update.", details: parsed.error.flatten() },
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
          create: {
            actionId: action.id,
            userId: user.id,
            date,
            completed: true,
          },
          update: { completed: true },
        });
        await applyActionContribution({
          goal,
          contributionValue: action.contributionValue,
          completing: true,
        });
      } else {
        await prisma.actionLog.deleteMany({
          where: { actionId: action.id, date },
        });
        await applyActionContribution({
          goal,
          contributionValue: action.contributionValue,
          completing: false,
        });
      }
    } else {
      const nowCompleted = data.completed ?? !action.completed;
      await prisma.action.update({
        where: { id: action.id },
        data: {
          completed: nowCompleted,
          completedAt: nowCompleted ? new Date() : null,
        },
      });
      if (action.completed !== nowCompleted) {
        await applyActionContribution({
          goal,
          contributionValue: action.contributionValue,
          completing: nowCompleted,
        });
      }
    }
  }

  // --- Milestones create: title + optional end date (targetDate) ---
  if (data.addMilestone) {
    const maxOrder = await prisma.milestone.aggregate({
      where: { goalId },
      _max: { order: true },
    });
    try {
      await prisma.milestone.create({
        data: {
          goalId,
          title: data.addMilestone.title,
          description: data.addMilestone.description || null,
          targetDate: parseDateInput(data.addMilestone.targetDate ?? null),
          order: (maxOrder._max.order ?? -1) + 1,
        },
      });
    } catch (e) {
      console.error("milestone create failed", e);
      return NextResponse.json(
        {
          error:
            "Could not save milestone. Ensure the database has Milestone.targetDate (run prisma db push).",
        },
        { status: 500 },
      );
    }
    await refreshMilestoneProgress(goalId);
  }

  if (data.addAction) {
    const recurrence = (data.addAction.recurrence ??
      "ONCE") as ActionRecurrence;
    await prisma.action.create({
      data: {
        goalId,
        title: data.addAction.title,
        notes: data.addAction.notes || null,
        dueDate: parseDateInput(data.addAction.dueDate ?? null),
        recurrence,
        daysOfWeek: data.addAction.daysOfWeek ?? [],
        timeOfDay: data.addAction.timeOfDay || null,
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
  if (data.frequencyTarget !== undefined)
    goalUpdate.frequencyTarget = data.frequencyTarget;
  if (data.status !== undefined) goalUpdate.status = data.status;
  if (data.deadline !== undefined) {
    goalUpdate.deadline = parseDateInput(data.deadline);
  }
  if (data.alignment !== undefined) goalUpdate.alignment = data.alignment;
  if (data.alignmentNote !== undefined)
    goalUpdate.alignmentNote = data.alignmentNote;
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
  if (!updated)
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  return NextResponse.json({
    goal: {
      ...updated,
      actions: mapActions(updated.actions as never),
      canEdit: true,
    },
  });
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
