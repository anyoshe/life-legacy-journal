import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  moneyAccountId: z.string().min(1),
  amount: z.number().finite().positive(),
  category: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  paymentMethod: z.string().trim().max(80).optional().nullable(),
  fundingSourceNote: z.string().trim().max(500).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const expenses = await prisma.moneyExpense.findMany({
    where: { userId: user.id },
    orderBy: { occurredAt: "desc" },
    take: 50,
    include: { moneyAccount: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ expenses });
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Amount and account required." }, { status: 400 });
  }
  const data = parsed.data;

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
            "This expense is more than the account balance. Explain where the extra money came from (fundingSourceNote), then try again.",
          code: "OVERSPEND_NEEDS_SOURCE",
          accountBalance: account.balance,
        },
        { status: 400 },
      );
    }
  }

  const expense = await prisma.$transaction(async (tx) => {
    const exp = await tx.moneyExpense.create({
      data: {
        userId: user.id,
        moneyAccountId: account.id,
        amount: data.amount,
        category: data.category ?? null,
        description: data.description ?? null,
        paymentMethod: data.paymentMethod ?? null,
        fundingSourceNote: data.fundingSourceNote ?? null,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      },
      include: { moneyAccount: { select: { id: true, name: true } } },
    });
    // Debit: allow negative only if they explained overspend (cash went negative after)
    await tx.moneyAccount.update({
      where: { id: account.id },
      data: { balance: account.balance - data.amount },
    });
    return exp;
  });

  return NextResponse.json({ expense }, { status: 201 });
}
