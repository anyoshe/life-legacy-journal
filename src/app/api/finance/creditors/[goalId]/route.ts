import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { InterestPeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { totalFromPrincipalAndRate } from "@/lib/debt-calc";

type Ctx = { params: Promise<{ goalId: string }> };

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

const patchSchema = z.object({
  creditorName: z.string().trim().min(1).max(200).optional(),
  principal: moneyAmount.optional(),
  totalOwed: optionalMoney,
  interestRate: optionalRate,
  interestPeriod: z.enum(["MONTHLY", "YEARLY"]).optional(),
  autoCalcTotal: z.boolean().optional(),
  borrowReason: z.string().trim().max(2000).optional().nullable(),
  borrowedAt: z.union([z.string(), z.null()]).optional().nullable(),
  deadline: z.union([z.string(), z.null()]).optional().nullable(),
  currency: z.string().trim().min(1).max(8).optional(),
});

function toDate(v: string | null | undefined) {
  if (v === null) return null;
  if (v === undefined) return undefined;
  if (!String(v).trim()) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T12:00:00.000Z`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Update one debt / creditor record */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { goalId } = await params;

  const existing = await prisma.financePlan.findFirst({
    where: { goalId, mode: "DEBT", goal: { userId: user.id } },
    include: { goal: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Debt record not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the numbers and fields.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const principal = d.principal ?? existing.principal ?? 0;
  const rate = d.interestRate !== undefined ? d.interestRate : existing.interestRate;
  const auto =
    d.autoCalcTotal !== undefined
      ? d.autoCalcTotal
      : ((existing as { autoCalcTotal?: boolean }).autoCalcTotal ?? true);
  const manualTotal = d.totalOwed !== undefined ? d.totalOwed : existing.totalOwed;
  const totalOwed = totalFromPrincipalAndRate(principal, rate, auto, manualTotal);
  const amountPaid = existing.amountPaid;
  const balance = Math.max(0, totalOwed - amountPaid);

  const plan = await prisma.$transaction(async (tx) => {
    await tx.goal.update({
      where: { id: goalId },
      data: {
        title: d.creditorName ? `Debt: ${d.creditorName}` : undefined,
        why:
          d.borrowReason !== undefined
            ? d.borrowReason || existing.goal.why
            : undefined,
        targetValue: totalOwed,
        unit: d.currency ?? existing.currency,
        deadline:
          d.deadline !== undefined ? toDate(d.deadline) ?? null : undefined,
      },
    });

    return tx.financePlan.update({
      where: { id: existing.id },
      data: {
        creditorName: d.creditorName ?? existing.creditorName,
        principal,
        interestRate: rate,
        interestPeriod: (d.interestPeriod ??
          (existing as { interestPeriod?: InterestPeriod }).interestPeriod ??
          InterestPeriod.YEARLY) as InterestPeriod,
        autoCalcTotal: auto,
        totalOwed,
        balance,
        borrowReason:
          d.borrowReason !== undefined
            ? d.borrowReason
            : (existing as { borrowReason?: string | null }).borrowReason,
        borrowedAt:
          d.borrowedAt !== undefined
            ? toDate(d.borrowedAt) ?? null
            : existing.borrowedAt,
        currency: d.currency ?? existing.currency,
      },
    });
  });

  return NextResponse.json({ plan, balance, totalOwed });
}
