/**
 * Habit check-in → goal progress.
 * KEY weight 1.0, SUPPORTING 0.4.
 * NUMERIC targets are spread over expected check-ins until deadline.
 * Optional sibling counts split the target so many KEY habits cannot each
 * assume 100% of the goal.
 */

export type HabitContributionRole = "KEY" | "SUPPORTING";

export type GoalForHabitContribution = {
  type: string;
  targetValue: number | null;
  currentValue: number | null;
  frequencyTarget: number | null;
  deadline: Date | string | null;
};

export type HabitForContribution = {
  targetPerWeek: number;
  contributionRole?: HabitContributionRole | string | null;
};

const KEY_WEIGHT = 1;
const SUPPORTING_WEIGHT = 0.4;
const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

export function roleWeight(role: string | null | undefined): number {
  return role === "KEY" ? KEY_WEIGHT : SUPPORTING_WEIGHT;
}

export function weeksUntilDeadline(
  deadline: Date | string | null | undefined,
  from: Date = new Date(),
): number {
  if (!deadline) return 52;
  const end = typeof deadline === "string" ? new Date(deadline) : deadline;
  if (Number.isNaN(end.getTime())) return 52;
  const weeks = (end.getTime() - from.getTime()) / MS_WEEK;
  if (weeks <= 1) return 1;
  return Math.min(weeks, 52 * 10);
}

export function unitsPerHabitCheckIn(
  habit: HabitForContribution,
  goal: GoalForHabitContribution,
  asOf: Date = new Date(),
  siblings?: { keyCount: number; supportingCount: number },
): number {
  const role = habit.contributionRole === "KEY" ? "KEY" : "SUPPORTING";
  let w = roleWeight(role);

  // Split share among habits of the same role so many KEYs don't each take full weight
  if (siblings) {
    if (role === "KEY" && siblings.keyCount > 1) {
      w = w / siblings.keyCount;
    } else if (role === "SUPPORTING" && siblings.supportingCount > 1) {
      w = w / siblings.supportingCount;
    }
  }

  const perWeek = Math.max(1, habit.targetPerWeek || 1);
  const type = goal.type;

  if (type === "FREQUENCY" || type === "HABIT") {
    return Math.round(w * 1000) / 1000;
  }

  if (type === "NUMERIC" || type === "MILESTONE") {
    const target =
      goal.targetValue != null && goal.targetValue > 0 ? goal.targetValue : null;
    if (target == null) {
      return Math.round(w * 1000) / 1000;
    }
    const weeks = weeksUntilDeadline(goal.deadline, asOf);
    const expectedCheckIns = Math.max(perWeek * weeks, perWeek);
    const raw = (target / expectedCheckIns) * w;
    return Math.max(0.0001, Math.round(raw * 10000) / 10000);
  }

  return Math.round(w * 1000) / 1000;
}

export function applyHabitContribution(options: {
  currentValue: number | null;
  targetValue: number | null;
  delta: number;
  completing: boolean;
}): { currentValue: number; completed: boolean } {
  const cur = options.currentValue ?? 0;
  let next = options.completing
    ? cur + options.delta
    : Math.max(0, cur - options.delta);
  const target = options.targetValue;
  // Cap so progress never exceeds the goal target
  if (target != null && target > 0 && next > target) {
    next = target;
  }
  const completed = target != null && target > 0 ? next >= target - 1e-9 : false;
  return {
    currentValue: Math.round(next * 10000) / 10000,
    completed,
  };
}

/** Simple parent rollup: sum children current/target when parent is NUMERIC-like. */
export function rollupParentFromChildren(
  children: Array<{ currentValue: number | null; targetValue: number | null }>,
): { currentValue: number; targetValue: number | null } {
  const currentValue = children.reduce((s, c) => s + (c.currentValue ?? 0), 0);
  const targets = children.map((c) => c.targetValue).filter((t): t is number => t != null && t > 0);
  const targetValue = targets.length ? targets.reduce((a, b) => a + b, 0) : null;
  return {
    currentValue: Math.round(currentValue * 10000) / 10000,
    targetValue,
  };
}
