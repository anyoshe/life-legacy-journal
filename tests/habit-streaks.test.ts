import { describe, expect, it } from "vitest";
import { computeHabitStreaks } from "../src/lib/habit-streaks";

describe("computeHabitStreaks", () => {
  it("returns zeros for empty logs", () => {
    expect(computeHabitStreaks([])).toEqual({ current: 0, best: 0 });
  });

  it("counts consecutive days ending today", () => {
    const today = new Date(Date.UTC(2026, 9, 16));
    const r = computeHabitStreaks(
      ["2026-10-14", "2026-10-15", "2026-10-16"],
      today,
    );
    expect(r.current).toBe(3);
    expect(r.best).toBe(3);
  });

  it("keeps streak if yesterday done but not today", () => {
    const today = new Date(Date.UTC(2026, 9, 16));
    const r = computeHabitStreaks(["2026-10-14", "2026-10-15"], today);
    expect(r.current).toBe(2);
  });

  it("breaks current streak on gap", () => {
    const today = new Date(Date.UTC(2026, 9, 16));
    const r = computeHabitStreaks(
      ["2026-10-10", "2026-10-11", "2026-10-16"],
      today,
    );
    expect(r.current).toBe(1);
    expect(r.best).toBe(2);
  });
});
