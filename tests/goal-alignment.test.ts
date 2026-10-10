import { describe, expect, it } from "vitest";
import { GoalAlignment } from "@prisma/client";
import {
  ALIGNMENT_LABELS,
  alignmentTouchesMission,
  alignmentTouchesVision,
  isExplicitlyAligned,
} from "../src/lib/goal-alignment";

describe("goal alignment helpers", () => {
  it("does not treat NONE as aligned", () => {
    expect(isExplicitlyAligned(GoalAlignment.NONE)).toBe(false);
    expect(isExplicitlyAligned(null)).toBe(false);
  });

  it("recognizes explicit vision and mission links", () => {
    expect(isExplicitlyAligned(GoalAlignment.VISION)).toBe(true);
    expect(isExplicitlyAligned(GoalAlignment.MISSION)).toBe(true);
    expect(isExplicitlyAligned(GoalAlignment.VISION_AND_MISSION)).toBe(true);
  });

  it("splits vision vs mission touch", () => {
    expect(alignmentTouchesVision(GoalAlignment.MISSION)).toBe(false);
    expect(alignmentTouchesMission(GoalAlignment.VISION)).toBe(false);
    expect(alignmentTouchesVision(GoalAlignment.VISION_AND_MISSION)).toBe(true);
    expect(alignmentTouchesMission(GoalAlignment.VISION_AND_MISSION)).toBe(true);
  });

  it("exposes human labels for every enum value", () => {
    for (const key of Object.keys(ALIGNMENT_LABELS)) {
      expect(ALIGNMENT_LABELS[key as GoalAlignment].length).toBeGreaterThan(0);
    }
  });
});
