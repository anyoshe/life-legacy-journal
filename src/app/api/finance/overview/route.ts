import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [accounts, assets, debts, expenses] = await Promise.all([
    prisma.moneyAccount.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.personalAsset.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.financePlan.findMany({
      where: { mode: "DEBT", goal: { userId: user.id } },
      include: { goal: { select: { id: true, title: true, deadline: true, status: true } } },
    }),
    prisma.moneyExpense.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: "desc" },
      take: 10,
      include: { moneyAccount: { select: { name: true } } },
    }),
  ]);

  let totalReceivable = 0;
  let debtorsCount = 0;
  try {
    const debtors = await prisma.debtor.findMany({
      where: { userId: user.id, balance: { gt: 0 } },
      select: { balance: true },
    });
    totalReceivable = debtors.reduce((s, d) => s + (d.balance || 0), 0);
    debtorsCount = debtors.length;
  } catch {
    /* debtors table may not exist yet */
  }

  const moneyAvailable = accounts.reduce((s, a) => s + a.balance, 0);
  const assetsTotal = assets.reduce((s, a) => s + a.value, 0);
  const totalDebt = debts.reduce((s, d) => s + (d.balance ?? 0), 0);

  // Cash + money owed to you − what you owe (+ assets in net worth)
  const liquidPosition = moneyAvailable + totalReceivable - totalDebt;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const expensesThisMonth = await prisma.moneyExpense.aggregate({
    where: { userId: user.id, occurredAt: { gte: monthStart } },
    _sum: { amount: true },
  });

  return NextResponse.json({
    moneyAvailable,
    totalReceivable,
    debtorsCount,
    assetsTotal,
    totalDebt,
    /** Cash + receivables − payables */
    liquidPosition,
    netWorthApprox: moneyAvailable + totalReceivable + assetsTotal - totalDebt,
    expensesThisMonth: expensesThisMonth._sum.amount ?? 0,
    accounts,
    assets,
    debts,
    recentExpenses: expenses,
  });
}
