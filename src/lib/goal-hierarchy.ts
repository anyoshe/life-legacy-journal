import { GoalHorizon } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Max parent→…→child chain length (root depth 0). */
export const MAX_GOAL_DEPTH = 5;

/**
 * Suggested ordering: longer horizons should not sit under shorter ones.
 * Empty = no rule enforced beyond ownership/cycles.
 */
const HORIZON_RANK: Record<GoalHorizon, number> = {
  LONG_TERM: 1,
  ANNUAL: 2,
  QUARTERLY: 3,
  MONTHLY: 4,
  WEEKLY: 5,
  DAILY: 6,
};

export function horizonRank(h: GoalHorizon | null | undefined): number | null {
  if (!h) return null;
  return HORIZON_RANK[h] ?? null;
}

/**
 * Walk ancestors from candidateParentId; detect cycles if it reaches goalId.
 * Returns ancestor chain ids from parent up to root.
 */
export async function getAncestorIds(
  candidateParentId: string,
  userId: string,
): Promise<string[]> {
  const ids: string[] = [];
  let current: string | null = candidateParentId;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) {
      // Corrupt cycle already in DB
      break;
    }
    seen.add(current);
    ids.push(current);
    const row: { id: string; parentGoalId: string | null } | null =
      await prisma.goal.findFirst({
        where: { id: current, userId },
        select: { id: true, parentGoalId: true },
      });
    if (!row) break;
    current = row.parentGoalId;
  }
  return ids;
}

export type ParentValidation =
  | { ok: true; parentId: string; depthFromRoot: number }
  | { ok: false; error: string; status: number };

/**
 * Validate attaching goalId (or a new goal) under parentGoalId.
 * goalId may be null when creating a new goal.
 */
export async function validateParentLink(options: {
  userId: string;
  parentGoalId: string;
  goalId?: string | null;
  childHorizon?: GoalHorizon | null;
}): Promise<ParentValidation> {
  const { userId, parentGoalId, goalId, childHorizon } = options;

  if (goalId && parentGoalId === goalId) {
    return {
      ok: false,
      error: "A goal cannot be its own parent.",
      status: 400,
    };
  }

  const parent = await prisma.goal.findFirst({
    where: { id: parentGoalId, userId },
    select: {
      id: true,
      parentGoalId: true,
      horizon: true,
      title: true,
    },
  });

  if (!parent) {
    return {
      ok: false,
      error: "Parent goal not found.",
      status: 404,
    };
  }

  // Cycle: parent (or its ancestors) must not include this goal
  if (goalId) {
    const ancestors = await getAncestorIds(parentGoalId, userId);
    if (ancestors.includes(goalId)) {
      return {
        ok: false,
        error: "That parent would create a circular goal relationship.",
        status: 400,
      };
    }
  }

  // Depth: ancestors of parent + parent itself + new child
  const ancestors = await getAncestorIds(parentGoalId, userId);
  const depthFromRoot = ancestors.length; // parent is at this depth (1-based count of nodes above child)
  if (depthFromRoot + 1 > MAX_GOAL_DEPTH) {
    return {
      ok: false,
      error: `Goals can only nest up to ${MAX_GOAL_DEPTH} levels.`,
      status: 400,
    };
  }

  // Horizon soft rule: child should not be longer-term than parent
  const parentRank = horizonRank(parent.horizon);
  const childRank = horizonRank(childHorizon ?? null);
  if (parentRank != null && childRank != null && childRank < parentRank) {
    return {
      ok: false,
      error:
        "A supporting goal cannot have a longer time horizon than its parent (e.g. a long-term goal under a monthly goal).",
      status: 400,
    };
  }

  return { ok: true, parentId: parent.id, depthFromRoot };
}

export async function loadGoalTreeSlice(goalId: string, userId: string) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: {
      id: true,
      title: true,
      parentGoalId: true,
      horizon: true,
      area: true,
      status: true,
      currentValue: true,
      targetValue: true,
      unit: true,
    },
  });
  if (!goal) return null;

  const parent = goal.parentGoalId
    ? await prisma.goal.findFirst({
        where: { id: goal.parentGoalId, userId },
        select: {
          id: true,
          title: true,
          horizon: true,
          status: true,
        },
      })
    : null;

  const children = await prisma.goal.findMany({
    where: { parentGoalId: goalId, userId },
    select: {
      id: true,
      title: true,
      horizon: true,
      status: true,
      area: true,
      currentValue: true,
      targetValue: true,
      unit: true,
    },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  return { goal, parent, children };
}
