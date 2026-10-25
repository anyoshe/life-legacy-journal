import { prisma } from "@/lib/prisma";
import type { Goal, Prisma } from "@prisma/client";

/** Canonical titles used when first seeding (may be renamed by the user later) */
export const DEBT_SUBGOAL_TITLE = "Clear all debts";
export const SAVINGS_SUBGOAL_TITLE = "Build savings";

/** @deprecated aliases */
export const UMBRELLA_DEBT_TITLE = DEBT_SUBGOAL_TITLE;
export const UMBRELLA_SAVINGS_TITLE = SAVINGS_SUBGOAL_TITLE;

export const boardGoalsWhere: Prisma.GoalWhereInput = {
  financePlan: null,
};

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match debt sub-goal even after the user renames it slightly */
export function looksLikeDebtSubgoal(title: string): boolean {
  const t = norm(title);
  if (t === norm(DEBT_SUBGOAL_TITLE)) return true;
  if (t.includes("clear") && t.includes("debt")) return true;
  if (t.includes("debt free") || t.includes("debt-free")) return true;
  if (t.includes("pay off") && t.includes("debt")) return true;
  if (t === "debts" || t === "debt") return true;
  return false;
}

/** Match savings sub-goal even after rename */
export function looksLikeSavingsSubgoal(title: string): boolean {
  const t = norm(title);
  if (t === norm(SAVINGS_SUBGOAL_TITLE)) return true;
  if (t.includes("saving")) return true; // savings, build savings, emergency savings…
  if (t.includes("save ") || t.startsWith("save")) return true;
  return false;
}

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
  const preferred = roots.find((g) =>
    /financial|finance|money|wealth/i.test(g.title),
  );
  return preferred ?? roots[0];
}

/**
 * Find an existing debt supporting goal under the root (any matching title).
 * Prefer oldest. Never create here.
 */
async function findDebtChild(
  userId: string,
  rootGoalId: string,
): Promise<Goal | null> {
  const children = await prisma.goal.findMany({
    where: {
      userId,
      parentGoalId: rootGoalId,
      financePlan: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
    orderBy: { createdAt: "asc" },
  });
  return children.find((c) => looksLikeDebtSubgoal(c.title)) ?? null;
}

async function findSavingsChild(
  userId: string,
  rootGoalId: string,
): Promise<Goal | null> {
  const children = await prisma.goal.findMany({
    where: {
      userId,
      parentGoalId: rootGoalId,
      financePlan: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
    orderBy: { createdAt: "asc" },
  });
  return children.find((c) => looksLikeSavingsSubgoal(c.title)) ?? null;
}

/**
 * Legacy top-level umbrellas (created before nesting) — re-parent, do not duplicate.
 */
async function adoptLegacyTopLevel(
  userId: string,
  rootGoalId: string,
  kind: "debt" | "savings",
): Promise<Goal | null> {
  const top = await prisma.goal.findMany({
    where: {
      userId,
      parentGoalId: null,
      financePlan: null,
      area: "FINANCIAL",
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
      id: { not: rootGoalId },
    },
    orderBy: { createdAt: "asc" },
  });
  const match = top.find((g) =>
    kind === "debt" ? looksLikeDebtSubgoal(g.title) : looksLikeSavingsSubgoal(g.title),
  );
  if (!match) return null;
  return prisma.goal.update({
    where: { id: match.id },
    data: { parentGoalId: rootGoalId, area: "FINANCIAL" },
  });
}

/**
 * Archive duplicate debt/savings children under the same root, keep the oldest.
 */
async function dedupeChildren(
  userId: string,
  rootGoalId: string,
  kind: "debt" | "savings",
): Promise<Goal | null> {
  const children = await prisma.goal.findMany({
    where: {
      userId,
      parentGoalId: rootGoalId,
      financePlan: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
    orderBy: { createdAt: "asc" },
  });
  const matches = children.filter((c) =>
    kind === "debt" ? looksLikeDebtSubgoal(c.title) : looksLikeSavingsSubgoal(c.title),
  );
  if (!matches.length) return null;
  const [keep, ...dupes] = matches;
  if (dupes.length) {
    await prisma.goal.updateMany({
      where: { id: { in: dupes.map((d) => d.id) } },
      data: { status: "ARCHIVED" },
    });
  }
  return keep;
}

export async function ensureUmbrellaDebtGoal(
  userId: string,
): Promise<Goal | null> {
  const root = await findFinanceRootGoal(userId);
  if (!root) return null;

  const existing = await findDebtChild(userId, root.id);
  if (existing) {
    await dedupeChildren(userId, root.id, "debt");
    return (await findDebtChild(userId, root.id)) ?? existing;
  }

  const adopted = await adoptLegacyTopLevel(userId, root.id, "debt");
  if (adopted) return adopted;

  return prisma.goal.create({
    data: {
      userId,
      parentGoalId: root.id,
      area: "FINANCIAL",
      type: "NUMERIC",
      title: DEBT_SUBGOAL_TITLE,
      why: "Supporting goal under Financial — cumulative progress clearing creditors.",
      description:
        "Totals roll up from individual debts. Manage payments under Finance → Creditors.",
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

  const existing = await findSavingsChild(userId, root.id);
  if (existing) {
    await dedupeChildren(userId, root.id, "savings");
    return (await findSavingsChild(userId, root.id)) ?? existing;
  }

  const adopted = await adoptLegacyTopLevel(userId, root.id, "savings");
  if (adopted) return adopted;

  return prisma.goal.create({
    data: {
      userId,
      parentGoalId: root.id,
      area: "FINANCIAL",
      type: "NUMERIC",
      title: SAVINGS_SUBGOAL_TITLE,
      why: "Supporting goal under Financial — cumulative savings.",
      description: "Totals roll up from savings targets under Finance.",
      unit: "KES",
      targetValue: 0,
      currentValue: 0,
      status: "ACTIVE",
      visibility: "PRIVATE",
    },
  });
}

/** Seed under a specific Financial root — update existing, never spam duplicates. */
export async function ensureFinanceSubgoalsForRoot(
  userId: string,
  rootGoalId: string,
): Promise<{ debt: Goal | null; savings: Goal | null }> {
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

  // Dedupe first if user already has several
  await dedupeChildren(userId, rootGoalId, "debt");
  await dedupeChildren(userId, rootGoalId, "savings");

  let debt = await findDebtChild(userId, rootGoalId);
  if (!debt) {
    debt = await adoptLegacyTopLevel(userId, rootGoalId, "debt");
  }
  if (!debt) {
    debt = await prisma.goal.create({
      data: {
        userId,
        parentGoalId: rootGoalId,
        area: "FINANCIAL",
        type: "NUMERIC",
        title: DEBT_SUBGOAL_TITLE,
        why: "Cumulative progress clearing every creditor. Manage payments under Finance → Creditors.",
        description:
          "Open this sub-goal to track milestones and actions for becoming debt-free.",
        unit: "KES",
        targetValue: 0,
        currentValue: 0,
        status: "ACTIVE",
        visibility: "PRIVATE",
      },
    });
  }

  let savings = await findSavingsChild(userId, rootGoalId);
  if (!savings) {
    savings = await adoptLegacyTopLevel(userId, rootGoalId, "savings");
  }
  if (!savings) {
    savings = await prisma.goal.create({
      data: {
        userId,
        parentGoalId: rootGoalId,
        area: "FINANCIAL",
        type: "NUMERIC",
        title: SAVINGS_SUBGOAL_TITLE,
        why: "Cumulative savings across targets. Contribute under Finance.",
        description:
          "Open this sub-goal to track milestones and actions for building savings.",
        unit: "KES",
        targetValue: 0,
        currentValue: 0,
        status: "ACTIVE",
        visibility: "PRIVATE",
      },
    });
  }

  return { debt, savings };
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
