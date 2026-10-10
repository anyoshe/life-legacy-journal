import { NextRequest, NextResponse } from "next/server";
import { ActionRecurrence, GoalAlignment, GoalHorizon, GoalStatus, GoalType } from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { calendarDateOnly } from "@/lib/dates";
import {
  computeContributionDelta,
  refreshMilestoneProgress,
} from "@/lib/goal-progress";
import { validateParentLink } from "@/lib/goal-hierarchy";
import { refreshRollupChain } from "@/lib/goal-rollup";
import { prisma } from "@/lib/prisma";

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
      })
      .optional(),
    addAction: z
      .object({
        title: z.string().trim().min(1).max(200),
        dueDate: z.string().datetime().optional(),
        notes: z.string().trim().max(2000).optional(),
        recurrence: z.nativeEnum(ActionRecurrence).optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
        timeOfDay: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .optional()
          .nullable(),
        contributionValue: z.number().finite().positive().optional().nullable(),
      })
      .optional(),
    deleteMilestoneId: z.string().min(1).optional(),
    deleteActionId: z.string().min(1).optional(),
    parentGoalId: z.string().min(1).nullable().optional(),
    horizon: z.nativeEnum(GoalHorizon).nullable().optional(),
    alignment: z.nativeEnum(GoalAlignment).optional(),
    alignmentNote: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ goalId: string }> };

async function loadGoal(goalId: string, userId: string) {
  const today = calendarDateOnly();
  return prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      milestones: { orderBy: { order: "asc" } },
      actions: {
        orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
        include: {
          logs: {
            where: { date: today },
            take: 1,
          },
        },
      },
      parentGoal: {
        select: { id: true, title: true, horizon: true, status: true },
      },
      childGoals: {
        where: { status: { not: GoalStatus.ARCHIVED } },
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
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
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

  const rawActions = goal.actions ?? [];
  const actions = rawActions.map((action) => {
    const isRecurring = action.recurrence !== ActionRecurrence.ONCE;
    const logs = "logs" in action ? (action as { logs?: { completed: boolean }[] }).logs : undefined;
    const doneToday = isRecurring
      ? (logs?.[0]?.completed ?? false)
      : action.completed;
    return { ...action, doneToday, logs: undefined };
  });

  return NextResponse.json({ goal: { ...goal, actions, canEdit: true } });
}

/**
 * Idempotent action completion inside a transaction:
 * - Recurring: unique (actionId, date) — only contribute on create or true transition
 * - ONCE: only contribute when completed flag actually flips
 */
async function toggleActionIdempotent(options: {
  goalId: string;
  userId: string;
  actionId: string;
  requestedCompleted: boolean | undefined;
}) {
  const { goalId, userId, actionId, requestedCompleted } = options;
  const today = calendarDateOnly();

  return prisma.$transaction(async (tx) => {
    const goal = await tx.goal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) return { error: "Goal not found." as const, status: 404 };

    const action = await tx.action.findFirst({
      where: { id: actionId, goalId },
    });
    if (!action) return { error: "Action not found." as const, status: 404 };

    const isRecurring = action.recurrence !== ActionRecurrence.ONCE;
    let transition: "complete" | "undo" | "noop" = "noop";

    if (isRecurring) {
      const existing = await tx.actionLog.findUnique({
        where: { actionId_date: { actionId: action.id, date: today } },
      });
      const wantComplete = requestedCompleted ?? true;

      if (wantComplete) {
        if (existing?.completed) {
          transition = "noop";
        } else if (existing && !existing.completed) {
          await tx.actionLog.update({
            where: { id: existing.id },
            data: { completed: true },
          });
          transition = "complete";
        } else {
          await tx.actionLog.create({
            data: {
              actionId: action.id,
              userId,
              date: today,
              completed: true,
            },
          });
          transition = "complete";
        }
      } else {
        if (!existing || !existing.completed) {
          transition = "noop";
          if (existing && !existing.completed) {
            await tx.actionLog.delete({ where: { id: existing.id } });
          }
        } else {
          await tx.actionLog.delete({ where: { id: existing.id } });
          transition = "undo";
        }
      }
    } else {
      const wasCompleted = action.completed;
      const nowCompleted = requestedCompleted ?? !action.completed;
      if (wasCompleted === nowCompleted) {
        transition = "noop";
      } else {
        await tx.action.update({
          where: { id: action.id },
          data: {
            completed: nowCompleted,
            completedAt: nowCompleted ? new Date() : null,
          },
        });
        transition = nowCompleted ? "complete" : "undo";
      }
    }

    if (transition === "noop") {
      return { transition, goal };
    }

    // YES_NO: only auto-complete whole goal if ≤1 action on this goal
    const actionCount = await tx.action.count({ where: { goalId } });
    const yesNoCompleteGoal =
      goal.type !== GoalType.YES_NO || actionCount <= 1;

    const pure = computeContributionDelta({
      goal: {
        id: goal.id,
        type: goal.type,
        currentValue: goal.currentValue,
        targetValue: goal.targetValue,
        frequencyTarget: goal.frequencyTarget,
        status: goal.status,
      },
      contributionValue: action.contributionValue,
      completing: transition === "complete",
      yesNoCompleteGoal,
    });

    if (!pure.skipped && Object.keys(pure.data).length > 0) {
      await tx.goal.update({ where: { id: goal.id }, data: pure.data });
    }

    return { transition, goal };
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
    return NextResponse.json({ error: "Invalid goal update." }, { status: 400 });
  }

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: user.id },
  });
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
    if (milestone.completed !== completed) {
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { completed, completedAt: completed ? new Date() : null },
      });
      await refreshMilestoneProgress(goalId);
    }
  }

  if (data.actionId) {
    const result = await toggleActionIdempotent({
      goalId,
      userId: user.id,
      actionId: data.actionId,
      requestedCompleted: data.completed,
    });
    if ("error" in result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 },
      );
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
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  if (data.addAction) {
    const recurrence = data.addAction.recurrence ?? ActionRecurrence.ONCE;
    await prisma.action.create({
      data: {
        goalId,
        title: data.addAction.title,
        notes: data.addAction.notes || null,
        dueDate: data.addAction.dueDate
          ? new Date(data.addAction.dueDate)
          : null,
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
    goalUpdate.deadline = data.deadline ? new Date(data.deadline) : null;
  }
  if (data.horizon !== undefined) {
    goalUpdate.horizon = data.horizon;
  }
  if (data.alignment !== undefined) {
    goalUpdate.alignment = data.alignment;
  }
  if (data.alignmentNote !== undefined) {
    goalUpdate.alignmentNote = data.alignmentNote;
  }
  if (data.parentGoalId !== undefined) {
    if (data.parentGoalId === null) {
      goalUpdate.parentGoalId = null;
    } else {
      const check = await validateParentLink({
        userId: user.id,
        parentGoalId: data.parentGoalId,
        goalId: goal.id,
        childHorizon:
          data.horizon !== undefined ? data.horizon : (goal as { horizon?: GoalHorizon | null }).horizon ?? null,
      });
      if (!check.ok) {
        return NextResponse.json(
          { error: check.error },
          { status: check.status },
        );
      }
      goalUpdate.parentGoalId = check.parentId;
    }
  }

  if (Object.keys(goalUpdate).length > 0) {
    goalUpdate.lastReviewedAt = new Date();
    await prisma.goal.update({ where: { id: goal.id }, data: goalUpdate });
  }

  const updated = await loadGoal(goal.id, user.id);
  if (!updated) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }

  const rawActions = updated.actions ?? [];
  const actions = rawActions.map((action) => {
    const isRecurring = action.recurrence !== ActionRecurrence.ONCE;
    const logs = "logs" in action ? (action as { logs?: { completed: boolean }[] }).logs : undefined;
    const doneToday = isRecurring
      ? (logs?.[0]?.completed ?? false)
      : action.completed;
    return { ...action, doneToday, logs: undefined };
  });

  return NextResponse.json({ goal: { ...updated, actions, canEdit: true } });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goalId } = await params;
  const existing = await prisma.goal.findFirst({
    where: { id: goalId, userId: user.id },
    select: { parentGoalId: true },
  });
  const deleted = await prisma.goal.deleteMany({
    where: { id: goalId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
  if (existing?.parentGoalId) {
    await refreshRollupChain(existing.parentGoalId, user.id);
  }

  return new NextResponse(null, { status: 204 });
}
