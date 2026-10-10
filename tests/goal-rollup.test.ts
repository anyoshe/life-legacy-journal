import { describe, expect, it } from "vitest";
import { GoalStatus, GoalType } from "@prisma/client";
import { computeParentRollupFromChildren } from "../src/lib/goal-rollup";

describe("computeParentRollupFromChildren", () => {
  it("returns null when there are no children", () => {
    expect(computeParentRollupFromChildren([])).toBeNull();
  });

  it("does not complete parent when only some children are done", () => {
    const r = computeParentRollupFromChildren([
      {
        id: "1",
        status: GoalStatus.COMPLETED,
        type: GoalType.NUMERIC,
        currentValue: 100,
        targetValue: 100,
      },
      {
        id: "2",
        status: GoalStatus.ACTIVE,
        type: GoalType.NUMERIC,
        currentValue: 0,
        targetValue: 50,
      },
    ]);
    expect(r).not.toBeNull();
    expect(r!.allChildrenCompleted).toBe(false);
    expect(r!.completedChildren).toBe(1);
    expect(r!.totalChildren).toBe(2);
    expect(r!.childCompletionPercent).toBe(50);
    expect(r!.suggestedStatus).not.toBe(GoalStatus.COMPLETED);
  });

  it("completes parent only when all children are COMPLETED", () => {
    const r = computeParentRollupFromChildren([
      {
        id: "1",
        status: GoalStatus.COMPLETED,
        type: GoalType.YES_NO,
        currentValue: 1,
        targetValue: 1,
      },
      {
        id: "2",
        status: GoalStatus.COMPLETED,
        type: GoalType.MILESTONE,
        currentValue: 100,
        targetValue: 100,
      },
    ]);
    expect(r!.allChildrenCompleted).toBe(true);
    expect(r!.childCompletionPercent).toBe(100);
    expect(r!.suggestedStatus).toBe(GoalStatus.COMPLETED);
  });

  it("never sums mixed units — uses dimensionless percent", () => {
    const r = computeParentRollupFromChildren([
      {
        id: "money",
        status: GoalStatus.ACTIVE,
        type: GoalType.NUMERIC,
        currentValue: 50000, // KES
        targetValue: 100000,
      },
      {
        id: "sessions",
        status: GoalStatus.ACTIVE,
        type: GoalType.NUMERIC,
        currentValue: 2,
        targetValue: 10,
      },
    ]);
    // 0.5 and 0.2 → avg 0.35 → 35%
    expect(r!.suggestedCurrentValue).toBe(35);
    expect(r!.suggestedUnit).toBe("% children");
    expect(r!.suggestedTargetValue).toBe(100);
  });

  it("treats one incomplete long chain leaf as blocking parent completion", () => {
    const r = computeParentRollupFromChildren([
      {
        id: "annual",
        status: GoalStatus.ON_TRACK,
        type: GoalType.NUMERIC,
        currentValue: 90,
        targetValue: 100,
      },
    ]);
    expect(r!.suggestedStatus).not.toBe(GoalStatus.COMPLETED);
    expect(r!.allChildrenCompleted).toBe(false);
  });
});
