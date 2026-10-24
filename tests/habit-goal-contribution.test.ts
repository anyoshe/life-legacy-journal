import { describe, expect, it } from "vitest";
import {
  applyHabitContribution,
  roleWeight,
  unitsPerHabitCheckIn,
  weeksUntilDeadline,
} from "../src/lib/habit-goal-contribution";

describe("habit-goal-contribution", () => {
  it("weights KEY higher than SUPPORTING", () => {
    expect(roleWeight("KEY")).toBe(1);
    expect(roleWeight("SUPPORTING")).toBe(0.4);
  });

  it("FREQUENCY check-in is one weighted unit", () => {
    const u = unitsPerHabitCheckIn(
      { targetPerWeek: 5, contributionRole: "KEY" },
      {
        type: "FREQUENCY",
        targetValue: null,
        currentValue: 0,
        frequencyTarget: 5,
        deadline: null,
      },
    );
    expect(u).toBe(1);
  });

  it("NUMERIC long horizon yields small per-day contribution", () => {
    const inFiveYears = new Date();
    inFiveYears.setFullYear(inFiveYears.getFullYear() + 5);
    const key = unitsPerHabitCheckIn(
      { targetPerWeek: 5, contributionRole: "KEY" },
      {
        type: "NUMERIC",
        targetValue: 1000,
        currentValue: 0,
        frequencyTarget: null,
        deadline: inFiveYears,
      },
    );
    const support = unitsPerHabitCheckIn(
      { targetPerWeek: 5, contributionRole: "SUPPORTING" },
      {
        type: "NUMERIC",
        targetValue: 1000,
        currentValue: 0,
        frequencyTarget: null,
        deadline: inFiveYears,
      },
    );
    expect(key).toBeGreaterThan(0);
    expect(key).toBeLessThan(2); // not a huge chunk of 1000 in one day
    expect(support).toBeLessThan(key);
  });

  it("applyHabitContribution completes when target reached", () => {
    const r = applyHabitContribution({
      currentValue: 9.5,
      targetValue: 10,
      delta: 1,
      completing: true,
    });
    expect(r.completed).toBe(true);
    expect(r.currentValue).toBeGreaterThanOrEqual(10);
  });

  it("weeksUntilDeadline defaults to 52", () => {
    expect(weeksUntilDeadline(null)).toBe(52);
  });
});
