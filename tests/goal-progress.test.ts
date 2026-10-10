import { describe, expect, it } from "vitest";
import { GoalType } from "@prisma/client";
import { computeContributionDelta } from "../src/lib/goal-progress";

function base(overrides: Partial<Parameters<typeof computeContributionDelta>[0]["goal"]> = {}) {
  return {
    id: "g1",
    type: GoalType.NUMERIC,
    currentValue: 0,
    targetValue: 10,
    frequencyTarget: null,
    status: "ACTIVE",
    ...overrides,
  };
}

describe("computeContributionDelta", () => {
  it("NUMERIC complete increments by contribution or 1", () => {
    const a = computeContributionDelta({
      goal: base({ currentValue: 3 }),
      contributionValue: 2,
      completing: true,
    });
    expect(a.skipped).toBe(false);
    expect(a.data.currentValue).toBe(5);

    const b = computeContributionDelta({
      goal: base({ currentValue: 9, targetValue: 10 }),
      contributionValue: 1,
      completing: true,
    });
    expect(b.data.currentValue).toBe(10);
    expect(b.data.status).toBe("COMPLETED");
  });

  it("NUMERIC undo reverses and reopens if needed", () => {
    const a = computeContributionDelta({
      goal: base({
        currentValue: 10,
        targetValue: 10,
        status: "COMPLETED",
      }),
      contributionValue: 1,
      completing: false,
    });
    expect(a.data.currentValue).toBe(9);
    expect(a.data.status).toBe("ACTIVE");
  });

  it("FREQUENCY increments by 1 and can mark ON_TRACK", () => {
    const a = computeContributionDelta({
      goal: base({
        type: GoalType.FREQUENCY,
        currentValue: 2,
        targetValue: null,
        frequencyTarget: 3,
      }),
      contributionValue: null,
      completing: true,
    });
    expect(a.data.currentValue).toBe(3);
    expect(a.data.status).toBe("ON_TRACK");
  });

  it("YES_NO with yesNoCompleteGoal true completes whole goal", () => {
    const a = computeContributionDelta({
      goal: base({ type: GoalType.YES_NO, currentValue: 0, targetValue: null }),
      contributionValue: null,
      completing: true,
      yesNoCompleteGoal: true,
    });
    expect(a.data.currentValue).toBe(1);
    expect(a.data.status).toBe("COMPLETED");
  });

  it("YES_NO with multiple actions does not force COMPLETED", () => {
    const a = computeContributionDelta({
      goal: base({ type: GoalType.YES_NO, currentValue: 0, targetValue: null }),
      contributionValue: null,
      completing: true,
      yesNoCompleteGoal: false,
    });
    expect(a.data.currentValue).toBe(1);
    expect(a.data.status).toBeUndefined();
  });

  it("MILESTONE type skips numeric invent", () => {
    const a = computeContributionDelta({
      goal: base({ type: GoalType.MILESTONE }),
      contributionValue: 1,
      completing: true,
    });
    expect(a.skipped).toBe(true);
  });

  it("never goes below zero on undo", () => {
    const a = computeContributionDelta({
      goal: base({ currentValue: 0 }),
      contributionValue: 5,
      completing: false,
    });
    expect(a.data.currentValue).toBe(0);
  });
});

describe("idempotency intent (documented)", () => {
  it("two identical complete deltas would double if applied twice — server must gate", () => {
    const first = computeContributionDelta({
      goal: base({ currentValue: 0 }),
      contributionValue: 1,
      completing: true,
    });
    const second = computeContributionDelta({
      goal: base({ currentValue: first.data.currentValue as number }),
      contributionValue: 1,
      completing: true,
    });
    // Pure function always applies — route must no-op second request
    expect(second.data.currentValue).toBe(2);
  });
});
