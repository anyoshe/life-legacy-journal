import { GoalStatus, GoalType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ChildProgressSlice = {
  id: string;
  status: GoalStatus | string;
  type: GoalType | string;
  currentValue: number | null;
  targetValue: number | null;
};

export type ParentRollupResult = {
  /** 0–100 completion signal from children — never a sum of mixed units */
  childCompletionPercent: number;
  completedChildren: number;
  totalChildren: number;
  allChildrenCompleted: boolean;
  /** Suggested parent currentValue when parent is treated as ratio-based */
  suggestedCurrentValue: number;
  suggestedTargetValue: number;
  suggestedUnit: string;
  suggestedStatus: GoalStatus;
};

/**
 * Parent progress from children:
 * - Never sums NUMERIC targets across different units (KES + kg + sessions).
 * - Uses share of children in COMPLETED status as the primary signal.
 * - Optional secondary: average of each child's own 0–1 ratio when
 *   currentValue/targetValue are present (still a dimensionless average).
 * - A single action on a leaf never marks a parent COMPLETED unless
 *   every child goal is COMPLETED.
 */
export function computeParentRollupFromChildren(
  children: ChildProgressSlice[],
): ParentRollupResult | null {
  if (children.length === 0) return null;

  const totalChildren = children.length;
  const completedChildren = children.filter(
    (c) => c.status === GoalStatus.COMPLETED || c.status === "COMPLETED",
  ).length;
  const allChildrenCompleted = completedChildren === totalChildren;
  const childCompletionPercent = Math.round(
    (completedChildren / totalChildren) * 100,
  );

  // Secondary: average of finite ratios (ignore missing targets)
  const ratios: number[] = [];
  for (const c of children) {
    if (
      c.status === GoalStatus.COMPLETED ||
      c.status === "COMPLETED"
    ) {
      ratios.push(1);
      continue;
    }
    if (
      c.targetValue != null &&
      c.targetValue > 0 &&
      c.currentValue != null &&
      Number.isFinite(c.currentValue)
    ) {
      ratios.push(Math.min(1, Math.max(0, c.currentValue / c.targetValue)));
    }
  }
  const avgRatio =
    ratios.length > 0
      ? ratios.reduce((a, b) => a + b, 0) / ratios.length
      : completedChildren / totalChildren;
  const suggestedCurrentValue = Math.round(avgRatio * 100);

  let suggestedStatus: GoalStatus = GoalStatus.ACTIVE;
  if (allChildrenCompleted) {
    suggestedStatus = GoalStatus.COMPLETED;
  } else if (childCompletionPercent >= 50 || suggestedCurrentValue >= 50) {
    suggestedStatus = GoalStatus.ON_TRACK;
  } else if (childCompletionPercent === 0 && suggestedCurrentValue === 0) {
    suggestedStatus = GoalStatus.ACTIVE;
  } else {
    suggestedStatus = GoalStatus.NEEDS_ATTENTION;
  }

  return {
    childCompletionPercent,
    completedChildren,
    totalChildren,
    allChildrenCompleted,
    suggestedCurrentValue,
    suggestedTargetValue: 100,
    suggestedUnit: "% children",
    suggestedStatus,
  };
}

/**
 * Apply roll-up to a parent goal. Does not invent money totals.
 * Preserves parent type; only updates currentValue/target/unit/status
 * when the parent has at least one non-archived child.
 */
export async function refreshParentRollup(
  parentGoalId: string,
  userId: string,
): Promise<ParentRollupResult | null> {
  const parent = await prisma.goal.findFirst({
    where: { id: parentGoalId, userId },
  });
  if (!parent) return null;

  const children = await prisma.goal.findMany({
    where: {
      parentGoalId: parent.id,
      userId,
      status: { not: GoalStatus.ARCHIVED },
    },
    select: {
      id: true,
      status: true,
      type: true,
      currentValue: true,
      targetValue: true,
    },
  });

  const rollup = computeParentRollupFromChildren(children);
  if (!rollup) return null;

  // Manual parent progress: if parent is QUALITATIVE and user set values,
  // still refresh status from children but only auto-complete when all done.
  const data: Prisma.GoalUpdateInput = {
    lastReviewedAt: new Date(),
    currentValue: rollup.suggestedCurrentValue,
    targetValue: rollup.suggestedTargetValue,
    unit: rollup.suggestedUnit,
  };

  // Never force COMPLETED on parent from partial children
  if (rollup.allChildrenCompleted) {
    data.status = GoalStatus.COMPLETED;
  } else if (parent.status === GoalStatus.COMPLETED) {
    // Children reopened → reopen parent
    data.status = rollup.suggestedStatus;
  } else if (
    parent.status !== GoalStatus.ABANDONED &&
    parent.status !== GoalStatus.ARCHIVED
  ) {
    data.status = rollup.suggestedStatus;
  }

  await prisma.goal.update({ where: { id: parent.id }, data });
  return rollup;
}

/**
 * After a goal changes, refresh its parent (one level).
 * Does not walk the full chain automatically to avoid surprising
 * long-term status flips; callers may chain if needed.
 */
export async function refreshRollupForGoal(
  goalId: string,
  userId: string,
): Promise<void> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { parentGoalId: true },
  });
  if (!goal?.parentGoalId) return;
  await refreshParentRollup(goal.parentGoalId, userId);
}

/**
 * Walk up parents (max depth) after a leaf change — still only
 * completes a parent when *its* children are all COMPLETED.
 */
export async function refreshRollupChain(
  goalId: string,
  userId: string,
  maxSteps = 5,
): Promise<void> {
  let currentId: string | null = goalId;
  for (let i = 0; i < maxSteps; i++) {
    const row: { parentGoalId: string | null } | null =
      await prisma.goal.findFirst({
        where: { id: currentId, userId },
        select: { parentGoalId: true },
      });
    if (!row?.parentGoalId) break;
    await refreshParentRollup(row.parentGoalId, userId);
    currentId = row.parentGoalId;
  }
}
