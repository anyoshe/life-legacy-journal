import { describe, expect, it } from "vitest";
import { GoalHorizon } from "@prisma/client";
import { horizonRank, MAX_GOAL_DEPTH } from "../src/lib/goal-hierarchy";

describe("goal hierarchy helpers", () => {
  it("ranks longer horizons lower numerically", () => {
    expect(horizonRank(GoalHorizon.LONG_TERM)).toBeLessThan(
      horizonRank(GoalHorizon.ANNUAL)!,
    );
    expect(horizonRank(GoalHorizon.ANNUAL)).toBeLessThan(
      horizonRank(GoalHorizon.MONTHLY)!,
    );
    expect(horizonRank(GoalHorizon.MONTHLY)).toBeLessThan(
      horizonRank(GoalHorizon.DAILY)!,
    );
  });

  it("returns null for missing horizon", () => {
    expect(horizonRank(null)).toBeNull();
    expect(horizonRank(undefined)).toBeNull();
  });

  it("defines a finite max depth", () => {
    expect(MAX_GOAL_DEPTH).toBeGreaterThanOrEqual(3);
    expect(MAX_GOAL_DEPTH).toBeLessThanOrEqual(8);
  });
});
