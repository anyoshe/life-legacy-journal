/**
 * How a single habit check-in moves a linked goal.
 *
 * Design:
 * - Each successful daily log = 1 practice event (idempotent per day).
 * - KEY habits carry full weight (1.0); SUPPORTING habits 0.4.
 * - FREQUENCY / HABIT goals: progress is a count of weighted practices
 *   (target is often frequencyTarget × weeks, or targetValue if set).
 * - NUMERIC goals with a deadline: spread targetValue across expected
 *   check-ins until the deadline (from targetPerWeek). A 5-year goal
 *   therefore gets a small fraction per day — many consistent days add up.
 * - NUMERIC without deadline: assume a 1-year horizon for sizing.
 * - Other types: apply the weight as a soft unit (still useful for rollups).
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
  if (!deadline) return 52; // 1 year default horizon
  const end = typeof deadline === "string" ? new Date(deadline) : deadline;
  if (Number.isNaN(end.getTime())) return 52;
  const weeks = (end.getTime() - from.getTime()) / MS_WEEK;
  if (weeks <= 1) return 1;
  // Cap very long goals so a single day is not microscopic beyond ~10 years
  return Math.min(weeks, 52 * 10);
}

/**
 * Progress units added (or removed on undo) for one check-in.
 */
export function unitsPerHabitCheckIn(
  habit: HabitForContribution,
  goal: GoalForHabitContribution,
  asOf: Date = new Date(),
): number {
  const w = roleWeight(habit.contributionRole);
  const perWeek = Math.max(1, habit.targetPerWeek || 1);
  const type = goal.type;

  if (type === "FREQUENCY" || type === "HABIT") {
    // One practice toward the frequency-style target
    return Math.round(w * 1000) / 1000;
  }

  if (type === "NUMERIC" || type === "MILESTONE") {
    const target = goal.targetValue != null && goal.targetValue > 0 ? goal.targetValue : null;
    if (target == null) {
      return Math.round(w * 1000) / 1000;
    }
    const weeks = weeksUntilDeadline(goal.deadline, asOf);
    const expectedCheckIns = Math.max(perWeek * weeks, perWeek);
    // KEY habits are intended to carry more of the target; SUPPORTING less.
    // We do not divide by number of habits (unknown at check-in time); weight handles share.
    const raw = (target / expectedCheckIns) * w;
    // Keep meaningful precision without zeroing long horizons
    return Math.max(0.0001, Math.round(raw * 10000) / 10000);
  }

  // YES_NO / QUALITATIVE: weighted soft progress
  return Math.round(w * 1000) / 1000;
}

export function applyHabitContribution(options: {
  currentValue: number | null;
  targetValue: number | null;
  delta: number;
  completing: boolean;
}): { currentValue: number; completed: boolean } {
  const cur = options.currentValue ?? 0;
  const next = options.completing
    ? cur + options.delta
    : Math.max(0, cur - options.delta);
  const target = options.targetValue;
  const completed =
    target != null && target > 0 ? next >= target - 1e-9 : false;
  return {
    currentValue: Math.round(next * 10000) / 10000,
    completed,
  };
}
