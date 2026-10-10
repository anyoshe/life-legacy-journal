import { GoalAlignment } from "@prisma/client";

export const ALIGNMENT_LABELS: Record<GoalAlignment, string> = {
  NONE: "Not linked",
  VISION: "Serves vision",
  MISSION: "Serves mission",
  VISION_AND_MISSION: "Serves vision & mission",
};

/**
 * Alignment is explicit user intent — never derived from GoalArea alone.
 * Area (FINANCIAL, MARRIAGE, …) is orthogonal to whether the user has
 * consciously tied this goal to their written vision/mission.
 */
export function isExplicitlyAligned(
  alignment: GoalAlignment | string | null | undefined,
): boolean {
  return (
    alignment === GoalAlignment.VISION ||
    alignment === GoalAlignment.MISSION ||
    alignment === GoalAlignment.VISION_AND_MISSION ||
    alignment === "VISION" ||
    alignment === "MISSION" ||
    alignment === "VISION_AND_MISSION"
  );
}

export function alignmentTouchesVision(
  alignment: GoalAlignment | string | null | undefined,
): boolean {
  return (
    alignment === GoalAlignment.VISION ||
    alignment === GoalAlignment.VISION_AND_MISSION ||
    alignment === "VISION" ||
    alignment === "VISION_AND_MISSION"
  );
}

export function alignmentTouchesMission(
  alignment: GoalAlignment | string | null | undefined,
): boolean {
  return (
    alignment === GoalAlignment.MISSION ||
    alignment === GoalAlignment.VISION_AND_MISSION ||
    alignment === "MISSION" ||
    alignment === "VISION_AND_MISSION"
  );
}
