import { prisma } from "@/lib/prisma";
import type { Goal, Prisma } from "@prisma/client";

export const UMBRELLA_DEBT_TITLE = "Clear all debts";
export const UMBRELLA_SAVINGS_TITLE = "Build savings";

/** Goals that have a FinancePlan are line-items — only manage them under /finance */
export const boardGoalsWhere: Prisma.GoalWhereInput = {
  financePlan: null,
};

export async function ensureUmbrellaDebtGoal(userId: string): Promise<Goal> {
  const existing = await prisma.goal.findFirst({
    where: {
      userId,
      area: "FINANCIAL",
      title: UMBRELLA_DEBT_TITLE,
      financePlan: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
  });
  if (existing) return existing;

  return prisma.goal.create({
    data: {
      userId,
      area: "FINANCIAL",
      type: "NUMERIC",
      title: UMBRELLA_DEBT_TITLE,
      why: "Cumulative progress clearing every creditor. Pay individual debts under Finance.",
      description:
        "This goal is the sum of all your debts. Open Finance → Creditors to pay each one; this bar rises as you pay.",
      unit: "KES",
      targetValue: 0,
      currentValue: 0,
      status: "ACTIVE",
      visibility: "PRIVATE",
    },
  });
}

export async function ensureUmbrellaSavingsGoal(userId: string): Promise<Goal> {
  const existing = await prisma.goal.findFirst({
    where: {
      userId,
      area: "FINANCIAL",
      title: UMBRELLA_SAVINGS_TITLE,
      financePlan: null,
      status: { notIn: ["ARCHIVED", "ABANDONED"] },
    },
  });
  if (existing) return existing;

  return prisma.goal.create({
    data: {
      userId,
      area: "FINANCIAL",
      type: "NUMERIC",
      title: UMBRELLA_SAVINGS_TITLE,
      why: "Cumulative savings across all targets. Contribute under Finance.",
      description:
        "Sum of all savings targets. Manage deposits under Finance; this bar rises as you save.",
      unit: "KES",
      targetValue: 0,
      currentValue: 0,
      status: "ACTIVE",
      visibility: "PRIVATE",
    },
  });
}

/** Roll up all DEBT finance plans into the umbrella debt goal. */
export async function rollupDebtUmbrella(userId: string): Promise<void> {
  const umbrella = await ensureUmbrellaDebtGoal(userId);

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

  // Link line-item goals under umbrella when missing parent
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

/** Roll up all SAVINGS finance plans into the umbrella savings goal. */
export async function rollupSavingsUmbrella(userId: string): Promise<void> {
  const umbrella = await ensureUmbrellaSavingsGoal(userId);

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
