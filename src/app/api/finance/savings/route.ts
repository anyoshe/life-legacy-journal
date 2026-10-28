import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SAVINGS_PURPOSES } from "@/lib/expense-categories";

const createSchema = z.object({
  purpose: z.string().min(1),
  purposeLabel: z.string().optional(),
  targetAmount: z.number().finite().positive(),
  currency: z.string().optional(),
  savingsDestination: z.string().optional(),
  deadline: z.string().optional().nullable(),
  title: z.string().optional(),
});

const contributeSchema = z.object({
  action: z.literal("contribute"),
  goalId: z.string().min(1),
  moneyAccountId: z.string().min(1),
  amount: z.number().finite().positive(),
  occurredAt: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.financePlan.findMany({
    where: {
      mode: "SAVINGS",
      goal: { userId: user.id, status: { notIn: ["ARCHIVED", "ABANDONED"] } },
    },
    include: {
      goal: { select: { id: true, title: true, deadline: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    purposes: SAVINGS_PURPOSES,
    savings: plans.map((p) => ({
      goalId: p.goalId,
      financePlanId: p.id,
      title: p.goal.title,
      status: p.goal.status,
      deadline: p.goal.deadline,
      purpose: (p as { savingsPurpose?: string | null }).savingsPurpose ?? null,
      purposeLabel:
        (p as { savingsPurposeLabel?: string | null }).savingsPurposeLabel ?? null,
      targetAmount: p.targetAmount ?? 0,
      savedAmount: p.savedAmount ?? 0,
      balance: Math.max(0, (p.targetAmount ?? 0) - (p.savedAmount ?? 0)),
      currency: p.currency,
      savingsDestination: p.savingsDestination,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // --- Contribute to savings (transfer, not expense) ---
  if ((body as { action?: string }).action === "contribute") {
    const parsed = contributeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Goal, account and amount are required." },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const plan = await prisma.financePlan.findFirst({
      where: {
        goalId: data.goalId,
        mode: "SAVINGS",
        goal: { userId: user.id },
      },
      include: { goal: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Savings goal not found." }, { status: 404 });
    }

    const account = await prisma.moneyAccount.findFirst({
      where: { id: data.moneyAccountId, userId: user.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (account.balance < data.amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance in ${account.name}. Available: ${account.balance} ${account.currency}. Top up the account first if needed.`,
        },
        { status: 400 },
      );
    }

    const occurredAt = data.occurredAt
      ? new Date(
          data.occurredAt.includes("T")
            ? data.occurredAt
            : data.occurredAt + "T12:00:00.000Z",
        )
      : new Date();

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Debit liquid account (money moves out of spendable cash)
        const updatedAccount = await tx.moneyAccount.update({
          where: { id: account.id },
          data: { balance: account.balance - data.amount },
        });

        // 2. Credit savings progress
        const newSaved = (plan.savedAmount ?? 0) + data.amount;
        const target = plan.targetAmount ?? 0;
        const updatedPlan = await tx.financePlan.update({
          where: { id: plan.id },
          data: { savedAmount: newSaved },
        });

        // 3. Record as CONTRIBUTION (not expense)
        const txn = await tx.financeTransaction.create({
          data: {
            financePlanId: plan.id,
            moneyAccountId: account.id,
            kind: "CONTRIBUTION",
            amount: data.amount,
            paymentMethod: data.paymentMethod || "Transfer",
            note: data.note || `Savings contribution to ${plan.goal.title}`,
            occurredAt,
          },
        });

        // 4. Sync goal progress for dashboards
        await tx.goal.update({
          where: { id: plan.goalId },
          data: {
            currentValue: newSaved,
            status:
              target > 0 && newSaved >= target
                ? "COMPLETED"
                : plan.goal.status === "COMPLETED"
                  ? "ACTIVE"
                  : plan.goal.status,
          },
        });

        return { updatedAccount, updatedPlan, txn, newSaved, target };
      });

      // Optional umbrella rollup if helper exists
      try {
        const { rollupSavingsUmbrella } = await import("@/lib/finance-umbrella");
        await rollupSavingsUmbrella(user.id);
      } catch {
        /* optional */
      }

      return NextResponse.json({
        ok: true,
        kind: "CONTRIBUTION",
        savedAmount: result.newSaved,
        remaining: Math.max(0, result.target - result.newSaved),
        accountBalance: result.updatedAccount.balance,
        message:
          "Contribution recorded as a transfer. This is not an expense — the money is still yours, allocated to savings.",
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "Could not record contribution." },
        { status: 500 },
      );
    }
  }

  // --- Create savings goal ---
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Purpose and target amount are required." },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const purposeMeta = SAVINGS_PURPOSES.find((p) => p.id === data.purpose);
  const label =
    data.purposeLabel?.trim() || purposeMeta?.label || data.purpose;
  const title = data.title?.trim() || `Save: ${label}`;

  let umbrellaId: string | null = null;
  try {
    const { ensureUmbrellaSavingsGoal } = await import("@/lib/finance-umbrella");
    const umbrella = await ensureUmbrellaSavingsGoal(user.id);
    umbrellaId = umbrella?.id ?? null;
  } catch {
    /* optional */
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.create({
        data: {
          userId: user.id,
          parentGoalId: umbrellaId,
          area: "FINANCIAL",
          type: "NUMERIC",
          title,
          why: `Saving towards ${label}`,
          unit: data.currency || "KES",
          targetValue: data.targetAmount,
          currentValue: 0,
          deadline: data.deadline
            ? new Date(
                data.deadline.includes("T")
                  ? data.deadline
                  : data.deadline + "T12:00:00.000Z",
              )
            : null,
          status: "ACTIVE",
          visibility: "PRIVATE",
        },
      });

      const plan = await tx.financePlan.create({
        data: {
          goalId: goal.id,
          mode: "SAVINGS",
          currency: data.currency || "KES",
          targetAmount: data.targetAmount,
          savedAmount: 0,
          savingsDestination: data.savingsDestination || null,
          savingsPurpose: data.purpose,
          savingsPurposeLabel: label,
        } as never,
      });

      return { goal, plan };
    });

    try {
      const { rollupSavingsUmbrella } = await import("@/lib/finance-umbrella");
      await rollupSavingsUmbrella(user.id);
    } catch {
      /* optional */
    }

    return NextResponse.json(
      { goalId: result.goal.id, financePlanId: result.plan.id },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "Could not create savings goal. Run prisma db push if columns are missing.",
      },
      { status: 500 },
    );
  }
}
