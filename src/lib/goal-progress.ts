import { GoalType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type GoalProgressSlice = {
  id: string;
  type: GoalType;
  currentValue: number | null;
  targetValue: number | null;
  frequencyTarget: number | null;
  status: string;
};

/**
 * Apply real progress when an action is completed (or undone).
 * Never invents percentages — only adjusts measurable fields.
 */
export async function applyActionContribution(options: {
  goal: GoalProgressSlice;
  contributionValue: number | null | undefined;
  completing: boolean; // true = done, false = undo
}) {
  const { goal, contributionValue, completing } = options;
  const delta = completing ? 1 : -1;
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
      if (goal.targetValue != null && goal.targetValue > 0 && next >= goal.targetValue) {
        data.status = "COMPLETED";
      }
      break;
    }
    case GoalType.FREQUENCY:
    case GoalType.HABIT: {
      const current = goal.currentValue ?? 0;
      const next = Math.max(0, current + delta);
      data.currentValue = next;
      if (
        goal.frequencyTarget != null &&
        goal.frequencyTarget > 0 &&
        next >= goal.frequencyTarget
      ) {
        data.status = "ON_TRACK";
      }
      break;
    }
    case GoalType.YES_NO: {
      if (completing) {
        data.currentValue = 1;
        data.status = "COMPLETED";
      } else {
        data.currentValue = 0;
        data.status = "ACTIVE";
      }
      break;
    }
    case GoalType.MILESTONE:
    case GoalType.QUALITATIVE:
    default:
      // Progress comes from milestones/actions completion ratio; no auto status invent
      break;
  }

  await prisma.goal.update({ where: { id: goal.id }, data });
}

/** Recompute milestone-style progress from completed milestones ratio into currentValue 0–100 */
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
      ...(pct >= 100 ? { status: "COMPLETED" } : {}),
    },
  });
}
