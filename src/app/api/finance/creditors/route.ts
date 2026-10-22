import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** All open debts (creditors) with remaining balances */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.financePlan.findMany({
    where: {
      mode: "DEBT",
      goal: { userId: user.id, status: { notIn: ["ARCHIVED", "ABANDONED"] } },
    },
    include: {
      goal: { select: { id: true, title: true, deadline: true, status: true } },
      transactions: {
        where: { kind: "PAYMENT" },
        orderBy: { occurredAt: "desc" },
        take: 3,
      },
    },
    orderBy: { balance: "desc" },
  });

  const creditors = plans.map((p) => ({
    financePlanId: p.id,
    goalId: p.goalId,
    goalTitle: p.goal.title,
    creditorName: p.creditorName || p.goal.title,
    balance: p.balance ?? 0,
    totalOwed: p.totalOwed ?? p.principal ?? 0,
    amountPaid: p.amountPaid,
    currency: p.currency,
    deadline: p.goal.deadline,
    status: p.goal.status,
    recentPayments: p.transactions,
  }));

  const totalDebt = creditors.reduce((s, c) => s + c.balance, 0);

  return NextResponse.json({ creditors, totalDebt });
}
