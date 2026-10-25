import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SAVINGS_PURPOSES } from "@/lib/expense-categories";
import { ensureUmbrellaSavingsGoal, rollupSavingsUmbrella } from "@/lib/finance-umbrella";

const createSchema = z.object({
  purpose: z.string().min(1),
  purposeLabel: z.string().optional(),
  targetAmount: z.number().finite().positive(),
  currency: z.string().optional(),
  savingsDestination: z.string().optional(),
  deadline: z.string().optional().nullable(),
  title: z.string().optional(),
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
      title: p.goal.title,
      status: p.goal.status,
      deadline: p.goal.deadline,
      purpose: (p as { savingsPurpose?: string | null }).savingsPurpose ?? null,
      purposeLabel:
        (p as { savingsPurposeLabel?: string | null }).savingsPurposeLabel ??
        null,
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
    data.purposeLabel?.trim() ||
    purposeMeta?.label ||
    data.purpose;
  const title =
    data.title?.trim() ||
    `Save: ${label}`;

  const umbrella = await ensureUmbrellaSavingsGoal(user.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.create({
        data: {
          userId: user.id,
          parentGoalId: umbrella?.id ?? null,
          area: "FINANCIAL",
          type: "NUMERIC",
          title,
          why: `Saving towards ${label}`,
          unit: data.currency || "KES",
          targetValue: data.targetAmount,
          currentValue: 0,
          deadline: data.deadline
            ? new Date(data.deadline.includes("T") ? data.deadline : data.deadline + "T12:00:00.000Z")
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

    await rollupSavingsUmbrella(user.id);

    return NextResponse.json(
      { goalId: result.goal.id, financePlanId: result.plan.id },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "Could not create savings goal. Run prisma db push if savingsPurpose columns are missing.",
      },
      { status: 500 },
    );
  }
}
