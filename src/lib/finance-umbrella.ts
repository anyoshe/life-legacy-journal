import { prisma } from "@/lib/prisma";
import type { Goal, Prisma } from "@prisma/client";

/** Sub-goal under the user's main Financial goal — holds rolled-up debt totals */
export const DEBT_SUBGOAL_TITLE = "Clear all debts";
/** Sub-goal under Financial — holds rolled-up savings totals */
export const SAVINGS_SUBGOAL_TITLE = "Build savings";

/** @deprecated use DEBT_SUBGOAL_TITLE — kept so old lookups still match */
export const UMBRELLA_DEBT_TITLE = DEBT_SUBGOAL_TITLE;
export const UMBRELLA_SAVINGS_TITLE = SAVINGS_SUBGOAL_TITLE;

/**
 * Board / dashboard: line-item creditor & savings goals (with FinancePlan)
 * stay off the main lists. Nested supporting goals without a plan still appear
 * only under their parent when the UI expands them.
 */
export const boardGoalsWhere: Prisma.GoalWhereInput = {
  financePlan: null,
};

/**
 * Find the user's main Financial root goal (not a line-item, not a child).
 * Does NOT create goals — avoids spawning extra FINANCIAL goals.
 */
export async function findFinanceRootGoal(
  userId: string,
): Promise<Goal | null> {
  const roots = await prisma.goal.findMany({
    where: {
      userId,
      area: "FINANCIAL",
      parentGoalId: null,
      financePlan: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!roots.length) return null;
  // Prefer an explicit "Financial" / life-area style title, else oldest root
  const preferred = roots.find((g) =>
    /financial|finance|money|wealth/i.test(g.title),
  );
  return preferred ?? roots[0];
}

/**
 * Debt totals live on a *supporting* goal under the Financial root — not as a
 * new top-level FINANCIAL goal. Only creates the sub-goal if a root exists.
 * Returns null if the user has no Financial root yet (no silent top-level create).
 */
export async function ensureUmbrellaDebtGoal(
  userId: string,
): Promise<Goal | null> {
  const root = await findFinanceRootGoal(userId);
  if (!root) {
    // Do not invent a top-level "Clear all debts" goal.
    return null;
  }

  const existing = await prisma.goal.findFirst({
    where: {
      userId,
      parentGoalId: root.id,
      title: DEBT_SUBGOAL_TITLE,
      financePlan: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
  });
  if (existing) return existing;

  // Migrate legacy top-level umbrella under the root if present
  const legacy = await prisma.goal.findFirst({
    where: {
      userId,
      title: DEBT_SUBGOAL_TITLE,
      financePlan: null,
      parentGoalId: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
  });
  if (legacy) {
    return prisma.goal.update({
      where: { id: legacy.id },
      data: { parentGoalId: root.id, area: "FINANCIAL" },
    });
  }

  return prisma.goal.create({
    data: {
      userId,
      parentGoalId: root.id,
      area: "FINANCIAL",
      type: "NUMERIC",
      title: DEBT_SUBGOAL_TITLE,
      why: "Supporting goal under Financial — cumulative progress clearing creditors. Pay each under Finance → Creditors.",
      description:
        "Totals roll up from individual debts. Expand Financial on the goals board to see this sub-goal.",
      unit: "KES",
      targetValue: 0,
      currentValue: 0,
      status: "ACTIVE",
      visibility: "PRIVATE",
    },
  });
}

export async function ensureUmbrellaSavingsGoal(
  userId: string,
): Promise<Goal | null> {
  const root = await findFinanceRootGoal(userId);
  if (!root) return null;

  const existing = await prisma.goal.findFirst({
    where: {
      userId,
      parentGoalId: root.id,
      title: SAVINGS_SUBGOAL_TITLE,
      financePlan: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
  });
  if (existing) return existing;

  const legacy = await prisma.goal.findFirst({
    where: {
      userId,
      title: SAVINGS_SUBGOAL_TITLE,
      financePlan: null,
      parentGoalId: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
  });
  if (legacy) {
    return prisma.goal.update({
      where: { id: legacy.id },
      data: { parentGoalId: root.id, area: "FINANCIAL" },
    });
  }

  return prisma.goal.create({
    data: {
      userId,
      parentGoalId: root.id,
      area: "FINANCIAL",
      type: "NUMERIC",
      title: SAVINGS_SUBGOAL_TITLE,
      why: "Supporting goal under Financial — cumulative savings. Contribute under Finance.",
      description:
        "Totals roll up from savings targets. Expand Financial to see this sub-goal.",
      unit: "KES",
      targetValue: 0,
      currentValue: 0,
      status: "ACTIVE",
      visibility: "PRIVATE",
    },
  });
}

export async function rollupDebtUmbrella(userId: string): Promise<void> {
  const umbrella = await ensureUmbrellaDebtGoal(userId);
  if (!umbrella) return;

  const plans = await prisma.financePlan.findMany({
    where: {
      mode: "DEBT",
      goal: { userId, status: { notIn: ["ARCHIVED", "ABANDONED"] } },
    },
  });

  const totalOwed = plans.reduce(
    (s, p) => s + (p.totalOwed ?? p.principal ?? 0),
    0,
  );
  const amountPaid = plans.reduce((s, p) => s + (p.amountPaid ?? 0), 0);
  const allClear = totalOwed > 0 && amountPaid >= totalOwed - 0.001;

  await prisma.goal.update({
    where: { id: umbrella.id },
    data: {
      targetValue: totalOwed,
      currentValue: Math.min(amountPaid, totalOwed),
      unit: plans[0]?.currency ?? "KES",
      status: allClear ? "COMPLETED" : amountPaid > 0 ? "ON_TRACK" : "ACTIVE",
    },
  });

  const lineGoals = await prisma.goal.findMany({
    where: {
      userId,
      financePlan: { is: { mode: "DEBT" } },
      OR: [{ parentGoalId: null }, { parentGoalId: { not: umbrella.id } }],
    },
    select: { id: true },
  });
  if (lineGoals.length) {
    await prisma.goal.updateMany({
      where: { id: { in: lineGoals.map((g) => g.id) } },
      data: { parentGoalId: umbrella.id },
    });
  }
}

export async function rollupSavingsUmbrella(userId: string): Promise<void> {
  const umbrella = await ensureUmbrellaSavingsGoal(userId);
  if (!umbrella) return;

  const plans = await prisma.financePlan.findMany({
    where: {
      mode: "SAVINGS",
      goal: { userId, status: { notIn: ["ARCHIVED", "ABANDONED"] } },
    },
  });

  const target = plans.reduce((s, p) => s + (p.targetAmount ?? 0), 0);
  const saved = plans.reduce((s, p) => s + (p.savedAmount ?? 0), 0);
  const done = target > 0 && saved >= target - 0.001;

  await prisma.goal.update({
    where: { id: umbrella.id },
    data: {
      targetValue: target,
      currentValue: Math.min(saved, target),
      unit: plans[0]?.currency ?? "KES",
      status: done ? "COMPLETED" : saved > 0 ? "ON_TRACK" : "ACTIVE",
    },
  });

  const lineGoals = await prisma.goal.findMany({
    where: {
      userId,
      financePlan: { is: { mode: "SAVINGS" } },
      OR: [{ parentGoalId: null }, { parentGoalId: { not: umbrella.id } }],
    },
    select: { id: true },
  });
  if (lineGoals.length) {
    await prisma.goal.updateMany({
      where: { id: { in: lineGoals.map((g) => g.id) } },
      data: { parentGoalId: umbrella.id },
    });
  }
}

export async function rollupFinanceUmbrellas(userId: string): Promise<void> {
  await rollupDebtUmbrella(userId);
  await rollupSavingsUmbrella(userId);
}


/** Create standard finance supporting goals under a specific Financial root. */
export async function ensureFinanceSubgoalsForRoot(
  userId: string,
  rootGoalId: string,
): Promise<{ debt: Goal; savings: Goal }> {
  const root = await prisma.goal.findFirst({
    where: {
      id: rootGoalId,
      userId,
      area: "FINANCIAL",
      parentGoalId: null,
      financePlan: null,
    },
  });
  if (!root) {
    throw new Error("Financial root goal not found.");
  }

  async function ensureChild(title: string, why: string, description: string) {
    const existing = await prisma.goal.findFirst({
      where: {
        userId,
        parentGoalId: rootGoalId,
        title,
        financePlan: null,
        status: { notIn: ["ARCHIVED", "ABANDONED"] },
      },
    });
    if (existing) return existing;

    // Re-parent legacy top-level umbrella if present
    const legacy = await prisma.goal.findFirst({
      where: {
        userId,
        title,
        financePlan: null,
        parentGoalId: null,
        status: { notIn: ["ARCHIVED", "ABANDONED"] },
      },
    });
    if (legacy) {
      return prisma.goal.update({
        where: { id: legacy.id },
        data: { parentGoalId: rootGoalId, area: "FINANCIAL" },
      });
    }

    return prisma.goal.create({
      data: {
        userId,
        parentGoalId: rootGoalId,
        area: "FINANCIAL",
        type: "NUMERIC",
        title,
        why,
        description,
        unit: "KES",
        targetValue: 0,
        currentValue: 0,
        status: "ACTIVE",
        visibility: "PRIVATE",
      },
    });
  }

  const debt = await ensureChild(
    DEBT_SUBGOAL_TITLE,
    "Cumulative progress clearing every creditor. Manage payments under Finance → Creditors.",
    "Open this sub-goal to track milestones and actions for becoming debt-free.",
  );
  const savings = await ensureChild(
    SAVINGS_SUBGOAL_TITLE,
    "Cumulative savings across targets. Contribute under Finance.",
    "Open this sub-goal to track milestones and actions for building savings.",
  );
  return { debt, savings };
}
