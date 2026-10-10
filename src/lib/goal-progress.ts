import { GoalStatus, GoalType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type GoalProgressSlice = {
  id: string;
  type: GoalType;
  currentValue: number | null;
  targetValue: number | null;
  frequencyTarget: number | null;
  status: string;
};

export type ContributionResult = {
  applied: boolean;
  reason:
    | "applied"
    | "noop_already_applied"
    | "noop_nothing_to_reverse"
    | "skipped_type";
  currentValue?: number | null;
  status?: string;
};

/**
 * Pure delta computation — unit-testable without Prisma.
 * YES_NO with multiple actions: only auto-complete the goal when
 * `yesNoCompleteGoal` is true (caller decides: sole action, or explicit).
 */
export function computeContributionDelta(options: {
  goal: GoalProgressSlice;
  contributionValue: number | null | undefined;
  completing: boolean;
  yesNoCompleteGoal?: boolean;
}): {
  data: Prisma.GoalUpdateInput;
  skipped: boolean;
} {
  const {
    goal,
    contributionValue,
    completing,
    yesNoCompleteGoal = true,
  } = options;
  const amount =
    contributionValue != null && Number.isFinite(contributionValue)
      ? contributionValue
      : 1;
  const data: Prisma.GoalUpdateInput = {
    lastReviewedAt: new Date(),
  };

  switch (goal.type) {
    case GoalType.NUMERIC: {
      const current = goal.currentValue ?? 0;
      const next = Math.max(0, current + (completing ? amount : -amount));
      data.currentValue = next;
      if (goal.targetValue != null && goal.targetValue > 0) {
        if (next >= goal.targetValue) {
          data.status = GoalStatus.COMPLETED;
        } else if (!completing && goal.status === GoalStatus.COMPLETED) {
          data.status = GoalStatus.ACTIVE;
        }
      }
      return { data, skipped: false };
    }
    case GoalType.FREQUENCY:
    case GoalType.HABIT: {
      const current = goal.currentValue ?? 0;
      const next = Math.max(0, current + (completing ? 1 : -1));
      data.currentValue = next;
      if (
        goal.frequencyTarget != null &&
        goal.frequencyTarget > 0 &&
        next >= goal.frequencyTarget
      ) {
        data.status = GoalStatus.ON_TRACK;
      } else if (
        !completing &&
        goal.status === GoalStatus.ON_TRACK &&
        goal.frequencyTarget != null &&
        next < goal.frequencyTarget
      ) {
        data.status = GoalStatus.ACTIVE;
      }
      return { data, skipped: false };
    }
    case GoalType.YES_NO: {
      if (!yesNoCompleteGoal) {
        // Multiple linked actions: treat like a single count, do not force COMPLETED
        const current = goal.currentValue ?? 0;
        const next = Math.max(0, current + (completing ? 1 : -1));
        data.currentValue = next;
        return { data, skipped: false };
      }
      if (completing) {
        data.currentValue = 1;
        data.status = GoalStatus.COMPLETED;
      } else {
        data.currentValue = 0;
        data.status = GoalStatus.ACTIVE;
      }
      return { data, skipped: false };
    }
    case GoalType.MILESTONE:
    case GoalType.QUALITATIVE:
    default:
      return { data: {}, skipped: true };
  }
}

/**
 * Apply progress only when the caller has established that this is a
 * genuine state transition (first complete or first undo for that log).
 */
export async function applyActionContribution(options: {
  goal: GoalProgressSlice;
  contributionValue: number | null | undefined;
  completing: boolean;
  yesNoCompleteGoal?: boolean;
}): Promise<ContributionResult> {
  const { data, skipped } = computeContributionDelta(options);
  if (skipped) {
    return { applied: false, reason: "skipped_type" };
  }
  const updated = await prisma.goal.update({
    where: { id: options.goal.id },
    data,
    select: { currentValue: true, status: true },
  });
  return {
    applied: true,
    reason: "applied",
    currentValue: updated.currentValue,
    status: updated.status,
  };
}

/** Recompute milestone-style progress from completed milestones ratio. */
export async function refreshMilestoneProgress(goalId: string) {
  const milestones = await prisma.milestone.findMany({ where: { goalId } });
  if (milestones.length === 0) return;
  const done = milestones.filter((m) => m.completed).length;
  const pct = Math.round((done / milestones.length) * 100);
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      currentValue: pct,
      targetValue: 100,
      unit: "%",
      lastReviewedAt: new Date(),
      ...(pct >= 100
        ? { status: GoalStatus.COMPLETED }
        : pct < 100
          ? {}
          : {}),
      ...(pct < 100
        ? {
            // If was completed and now incomplete, reopen
          }
        : {}),
    },
  });
  if (pct < 100) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { status: true },
    });
    if (goal?.status === GoalStatus.COMPLETED) {
      await prisma.goal.update({
        where: { id: goalId },
        data: { status: GoalStatus.ACTIVE },
      });
    }
  }
}

/**
 * Count sibling actions for YES_NO rule:
 * auto-complete goal only when there is exactly one action, or caller overrides.
 */
export async function shouldYesNoCompleteGoal(goalId: string): Promise<boolean> {
  const count = await prisma.action.count({ where: { goalId } });
  return count <= 1;
}
