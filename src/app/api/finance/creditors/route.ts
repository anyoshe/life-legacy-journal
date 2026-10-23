import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { totalFromPrincipalAndRate } from "@/lib/debt-calc";

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
    borrowReason: (p as { borrowReason?: string | null }).borrowReason ?? null,
    principal: p.principal,
    interestRate: p.interestRate,
    interestPeriod: (p as { interestPeriod?: string }).interestPeriod ?? "YEARLY",
    autoCalcTotal: (p as { autoCalcTotal?: boolean }).autoCalcTotal ?? true,
    balance: p.balance ?? 0,
    totalOwed: p.totalOwed ?? p.principal ?? 0,
    amountPaid: p.amountPaid,
    currency: p.currency,
    borrowedAt: p.borrowedAt,
    deadline: p.goal.deadline,
    status: p.goal.status,
    recentPayments: p.transactions,
  }));

  const totalDebt = creditors.reduce((s, c) => s + c.balance, 0);
  return NextResponse.json({ creditors, totalDebt });
}

const moneyAmount = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    if (!cleaned) return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}, z.number().finite().positive());

const optionalMoney = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}, z.number().finite().min(0).nullable().optional());

const optionalRate = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}, z.number().finite().min(0).max(1000).nullable().optional());

const createSchema = z.object({
  creditorName: z.string().trim().min(1).max(200),
  principal: moneyAmount,
  totalOwed: optionalMoney,
  interestRate: optionalRate,
  interestPeriod: z.enum(["MONTHLY", "YEARLY"]).optional().default("YEARLY"),
  autoCalcTotal: z.boolean().optional().default(true),
  borrowReason: z.string().trim().max(2000).optional().nullable(),
  borrowedAt: z.union([z.string(), z.null()]).optional().nullable(),
  deadline: z.union([z.string(), z.null()]).optional().nullable(),
  currency: z.string().trim().min(1).max(8).optional().default("KES"),
});

function toDate(v: string | null | undefined) {
  if (!v || !String(v).trim()) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T12:00:00.000Z`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
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
      { error: "Enter who you owe and a principal greater than zero.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const auto = data.autoCalcTotal !== false;
  const totalOwed = totalFromPrincipalAndRate(
    data.principal,
    data.interestRate,
    auto,
    data.totalOwed,
    {
      period: data.interestPeriod || "YEARLY",
      borrowedAt: data.borrowedAt,
    },
  );
  const title = `Debt: ${data.creditorName}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.create({
        data: {
          userId: user.id,
          area: "FINANCIAL",
          type: "NUMERIC",
          title,
          why: data.borrowReason || `Pay off ${data.creditorName}`,
          unit: data.currency || "KES",
          targetValue: totalOwed,
          currentValue: 0,
          deadline: toDate(data.deadline),
          status: "ACTIVE",
          visibility: "PRIVATE",
        },
      });

      const plan = await tx.financePlan.create({
        data: {
          goalId: goal.id,
          mode: "DEBT",
          currency: data.currency || "KES",
          creditorName: data.creditorName,
          borrowedAt: toDate(data.borrowedAt),
          borrowReason: data.borrowReason || null,
          principal: data.principal,
          interestRate: data.interestRate ?? null,
          interestPeriod: data.interestPeriod || "YEARLY",
          autoCalcTotal: auto,
          totalOwed,
          amountPaid: 0,
          balance: totalOwed,
        },
      });

      return { goal, plan };
    });

    return NextResponse.json(
      {
        goalId: result.goal.id,
        financePlanId: result.plan.id,
        creditorName: data.creditorName,
        balance: totalOwed,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not save creditor. Run prisma db push if finance columns are missing." },
      { status: 500 },
    );
  }
}
