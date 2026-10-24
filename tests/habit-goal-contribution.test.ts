import { describe, expect, it } from "vitest";
import {
  applyHabitContribution,
  roleWeight,
  rollupParentFromChildren,
  unitsPerHabitCheckIn,
} from "../src/lib/habit-goal-contribution";

describe("habit-goal-contribution", () => {
  it("caps at target", () => {
    const r = applyHabitContribution({
      currentValue: 9.8,
      targetValue: 10,
      delta: 5,
      completing: true,
    });
    expect(r.currentValue).toBe(10);
    expect(r.completed).toBe(true);
  });

  it("splits KEY weight among sibling KEY habits", () => {
    const goal = {
      type: "FREQUENCY",
      targetValue: null,
      currentValue: 0,
      frequencyTarget: 5,
      deadline: null,
    };
    const one = unitsPerHabitCheckIn(
      { targetPerWeek: 5, contributionRole: "KEY" },
      goal,
      new Date(),
      { keyCount: 1, supportingCount: 1 },
    );
    const many = unitsPerHabitCheckIn(
      { targetPerWeek: 5, contributionRole: "KEY" },
      goal,
      new Date(),
      { keyCount: 4, supportingCount: 1 },
    );
    expect(one).toBe(1);
    expect(many).toBe(0.25);
  });

  it("rollups parent from children", () => {
    const r = rollupParentFromChildren([
      { currentValue: 10, targetValue: 100 },
      { currentValue: 20, targetValue: 50 },
    ]);
    expect(r.currentValue).toBe(30);
    expect(r.targetValue).toBe(150);
  });

  it("SUPPORTING lighter than KEY", () => {
    expect(roleWeight("SUPPORTING")).toBeLessThan(roleWeight("KEY"));
  });
});
