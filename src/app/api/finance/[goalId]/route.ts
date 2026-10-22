import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ goalId: string }> };

const money = z.number().finite().nonnegative();

const upsertPlanSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("DEBT"),
    currency: z.string().trim().min(1).max(8).default("KES"),
    creditorName: z.string().trim().min(1).max(200),
    borrowedAt: z.string().datetime().optional().nullable(),
    principal: money,
    interestRate: z.number().finite().min(0).max(100).optional().nullable(),
    totalOwed: money.optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
  }),
  z.object({
    mode: z.literal("SAVINGS"),
    currency: z.string().trim().min(1).max(8).default("KES"),
    targetAmount: money,
    savingsDestination: z.string().trim().max(200).optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
  }),
]);

const txnSchema = z.object({
  kind: z.enum(["PAYMENT", "CONTRIBUTION", "INTEREST", "ADJUSTMENT"]),
  amount: z.number().finite().positive(),
  paymentMethod: z.string().trim().max(80).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
  moneyAccountId: z.string().min(1).optional().nullable(),
  fundingSourceNote: z.string().trim().max(500).optional().nullable(),
});

async function ownedGoal(userId: string, goalId: string) {
  return prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      financePlan: {
        include: {
          transactions: { orderBy: { occurredAt: "desc" }, take: 50 },
        },
      },
    },
  });
}

function recomputeDebt(plan: {
  totalOwed: number | null;
  principal: number | null;
  amountPaid: number;
}) {
  const owed = plan.totalOwed ?? plan.principal ?? 0;
  const paid = plan.amountPaid ?? 0;
  return { balance: Math.max(0, owed - paid), totalOwed: owed };
}

function recomputeSavings(plan: {
  targetAmount: number | null;
  savedAmount: number;
}) {
  const target = plan.targetAmount ?? 0;
  const saved = plan.savedAmount ?? 0;
  return {
    remaining: Math.max(0, target - saved),
    progress: target > 0 ? Math.min(100, (saved / target) * 100) : 0,
  };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { goalId } = await params;
  const goal = await ownedGoal(user.id, goalId);
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  const plan = goal.financePlan;
  if (!plan) {
    return NextResponse.json({
      plan: null,
      goal: { id: goal.id, title: goal.title, deadline: goal.deadline },
    });
  }
  const extra = plan.mode === "DEBT" ? recomputeDebt(plan) : recomputeSavings(plan);
  return NextResponse.json({
    plan,
    summary: extra,
    goal: { id: goal.id, title: goal.title, deadline: goal.deadline },
  });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { goalId } = await params;
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id } });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = upsertPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the finance numbers." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.mode === "DEBT") {
    const totalOwed = data.totalOwed ?? data.principal;
    await prisma.goal.update({
      where: { id: goalId },
      data: {
        type: "NUMERIC",
        unit: data.currency,
        targetValue: totalOwed,
        deadline: data.deadline ? new Date(data.deadline) : goal.deadline,
      },
    });
    const plan = await prisma.financePlan.upsert({
      where: { goalId },
      create: {
        goalId,
        mode: "DEBT",
        currency: data.currency,
        creditorName: data.creditorName,
        borrowedAt: data.borrowedAt ? new Date(data.borrowedAt) : null,
        principal: data.principal,
        interestRate: data.interestRate ?? null,
        totalOwed,
        amountPaid: 0,
        balance: totalOwed,
      },
      update: {
        mode: "DEBT",
        currency: data.currency,
        creditorName: data.creditorName,
        borrowedAt: data.borrowedAt ? new Date(data.borrowedAt) : null,
        principal: data.principal,
        interestRate: data.interestRate ?? null,
        totalOwed,
      },
      include: { transactions: { orderBy: { occurredAt: "desc" }, take: 50 } },
    });
    const { balance, totalOwed: owed } = recomputeDebt(plan);
    const updated = await prisma.financePlan.update({
      where: { id: plan.id },
      data: { balance, totalOwed: owed },
      include: { transactions: { orderBy: { occurredAt: "desc" }, take: 50 } },
    });
    return NextResponse.json({ plan: updated, summary: recomputeDebt(updated) });
  }

  await prisma.goal.update({
    where: { id: goalId },
    data: {
      type: "NUMERIC",
      unit: data.currency,
      targetValue: data.targetAmount,
      deadline: data.deadline ? new Date(data.deadline) : goal.deadline,
    },
  });
  const plan = await prisma.financePlan.upsert({
    where: { goalId },
    create: {
      goalId,
      mode: "SAVINGS",
      currency: data.currency,
      targetAmount: data.targetAmount,
      savedAmount: 0,
      savingsDestination: data.savingsDestination ?? null,
    },
    update: {
      mode: "SAVINGS",
      currency: data.currency,
      targetAmount: data.targetAmount,
      savingsDestination: data.savingsDestination ?? null,
    },
    include: { transactions: { orderBy: { occurredAt: "desc" }, take: 50 } },
  });
  return NextResponse.json({ plan, summary: recomputeSavings(plan) });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { goalId } = await params;
  const goal = await ownedGoal(user.id, goalId);
  if (!goal?.financePlan) {
    return NextResponse.json({ error: "Set up debt or savings first." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = txnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }
  const data = parsed.data;
  const plan = goal.financePlan;
  const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();

  if (plan.mode === "DEBT" && data.kind === "PAYMENT") {
    if (!data.moneyAccountId) {
      return NextResponse.json(
        { error: "Choose which account the payment comes from." },
        { status: 400 },
      );
    }
    const account = await prisma.moneyAccount.findFirst({
      where: { id: data.moneyAccountId, userId: user.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (data.amount > account.balance) {
      if (!data.fundingSourceNote || data.fundingSourceNote.trim().length < 3) {
        return NextResponse.json(
          {
            error:
              "Payment is larger than this account balance. Explain where the money came from, then confirm.",
            code: "OVERSPEND_NEEDS_SOURCE",
            accountBalance: account.balance,
          },
          { status: 400 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.financeTransaction.create({
        data: {
          financePlanId: plan.id,
          moneyAccountId: account.id,
          kind: "PAYMENT",
          amount: data.amount,
          paymentMethod: data.paymentMethod || null,
          note: [data.note, data.fundingSourceNote].filter(Boolean).join(" · ") || null,
          occurredAt,
        },
      });
      await tx.moneyAccount.update({
        where: { id: account.id },
        data: { balance: account.balance - data.amount },
      });
      const amountPaid = plan.amountPaid + data.amount;
      const totalOwed = plan.totalOwed ?? plan.principal ?? 0;
      const balance = Math.max(0, totalOwed - amountPaid);
      const next = await tx.financePlan.update({
        where: { id: plan.id },
        data: { amountPaid, balance },
        include: { transactions: { orderBy: { occurredAt: "desc" }, take: 50 } },
      });
      await tx.goal.update({
        where: { id: goalId },
        data: {
          currentValue: amountPaid,
          status: balance <= 0 ? "COMPLETED" : undefined,
        },
      });
      return next;
    });
    return NextResponse.json({ plan: result, summary: recomputeDebt(result) }, { status: 201 });
  }

  // INTEREST / CONTRIBUTION / other (contribution does not force account yet)
  if (plan.mode === "DEBT" && data.kind === "INTEREST") {
    const totalOwed = (plan.totalOwed ?? plan.principal ?? 0) + data.amount;
    const balance = Math.max(0, totalOwed - plan.amountPaid);
    const next = await prisma.$transaction(async (tx) => {
      await tx.financeTransaction.create({
        data: {
          financePlanId: plan.id,
          kind: "INTEREST",
          amount: data.amount,
          note: data.note || "Interest accrued",
          occurredAt,
        },
      });
      return tx.financePlan.update({
        where: { id: plan.id },
        data: { totalOwed, balance },
        include: { transactions: { orderBy: { occurredAt: "desc" }, take: 50 } },
      });
    });
    await prisma.goal.update({ where: { id: goalId }, data: { targetValue: totalOwed } });
    return NextResponse.json({ plan: next, summary: recomputeDebt(next) }, { status: 201 });
  }

  if (plan.mode === "SAVINGS" && (data.kind === "CONTRIBUTION" || data.kind === "ADJUSTMENT")) {
    if (data.kind === "CONTRIBUTION" && data.moneyAccountId) {
      const account = await prisma.moneyAccount.findFirst({
        where: { id: data.moneyAccountId, userId: user.id },
      });
      if (!account) {
        return NextResponse.json({ error: "Account not found." }, { status: 404 });
      }
      if (data.amount > account.balance) {
        if (!data.fundingSourceNote || data.fundingSourceNote.trim().length < 3) {
          return NextResponse.json(
            {
              error:
                "Deposit is larger than account balance. Explain where the money came from.",
              code: "OVERSPEND_NEEDS_SOURCE",
              accountBalance: account.balance,
            },
            { status: 400 },
          );
        }
      }
      const next = await prisma.$transaction(async (tx) => {
        await tx.financeTransaction.create({
          data: {
            financePlanId: plan.id,
            moneyAccountId: account.id,
            kind: "CONTRIBUTION",
            amount: data.amount,
            paymentMethod: data.paymentMethod || null,
            note: data.note || null,
            occurredAt,
          },
        });
        await tx.moneyAccount.update({
          where: { id: account.id },
          data: { balance: account.balance - data.amount },
        });
        const savedAmount = plan.savedAmount + data.amount;
        return tx.financePlan.update({
          where: { id: plan.id },
          data: { savedAmount },
          include: { transactions: { orderBy: { occurredAt: "desc" }, take: 50 } },
        });
      });
      await prisma.goal.update({
        where: { id: goalId },
        data: {
          currentValue: next.savedAmount,
          status:
            (plan.targetAmount ?? 0) > 0 && next.savedAmount >= (plan.targetAmount ?? 0)
              ? "COMPLETED"
              : undefined,
        },
      });
      return NextResponse.json({ plan: next, summary: recomputeSavings(next) }, { status: 201 });
    }

    const savedAmount = plan.savedAmount + data.amount;
    const next = await prisma.$transaction(async (tx) => {
      await tx.financeTransaction.create({
        data: {
          financePlanId: plan.id,
          kind: data.kind,
          amount: data.amount,
          paymentMethod: data.paymentMethod || null,
          note: data.note || null,
          occurredAt,
        },
      });
      return tx.financePlan.update({
        where: { id: plan.id },
        data: { savedAmount },
        include: { transactions: { orderBy: { occurredAt: "desc" }, take: 50 } },
      });
    });
    await prisma.goal.update({
      where: { id: goalId },
      data: { currentValue: savedAmount },
    });
    return NextResponse.json({ plan: next, summary: recomputeSavings(next) }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported transaction." }, { status: 400 });
}
