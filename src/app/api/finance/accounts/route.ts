import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.string().trim().max(40).default("CASH"),
  currency: z.string().trim().min(1).max(8).default("KES"),
  /** Opening balance only when first creating the account */
  openingBalance: z.number().finite().nonnegative().optional().default(0),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.moneyAccount.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: {
      topUps: {
        orderBy: { occurredAt: "desc" },
        take: 5,
      },
    },
  });
  return NextResponse.json({ accounts });
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

  // Top-up existing account
  if ((body as { action?: string }).action === "topup") {
    const topSchema = z.object({
      action: z.literal("topup"),
      accountId: z.string().min(1),
      amount: z.number().finite().positive(),
      source: z.string().trim().max(120).optional().nullable(),
      purpose: z.string().trim().max(200).optional().nullable(),
      occurredAt: z.string().optional().nullable(),
      notes: z.string().trim().max(500).optional().nullable(),
    });
    const parsed = topSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Account, amount, and top-up details required." },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const account = await prisma.moneyAccount.findFirst({
      where: { id: data.accountId, userId: user.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
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
        const topUp = await tx.moneyAccountTopUp.create({
          data: {
            moneyAccountId: account.id,
            userId: user.id,
            amount: data.amount,
            source: data.source || null,
            purpose: data.purpose || null,
            occurredAt,
            notes: data.notes || null,
          },
        });
        const updated = await tx.moneyAccount.update({
          where: { id: account.id },
          data: { balance: account.balance + data.amount },
        });
        return { topUp, account: updated };
      });
      return NextResponse.json(result, { status: 201 });
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        {
          error:
            "Could not top up. Run prisma db push if money_account_topups is missing.",
        },
        { status: 500 },
      );
    }
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Account name is required." },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const opening = data.openingBalance ?? 0;

  try {
    const account = await prisma.moneyAccount.create({
      data: {
        userId: user.id,
        name: data.name,
        kind: data.kind || "CASH",
        currency: data.currency || "KES",
        balance: opening,
        notes: data.notes ?? null,
      },
    });
    if (opening > 0) {
      try {
        await prisma.moneyAccountTopUp.create({
          data: {
            moneyAccountId: account.id,
            userId: user.id,
            amount: opening,
            source: "Opening balance",
            purpose: "Initial account setup",
            occurredAt: new Date(),
          },
        });
      } catch {
        /* table may not exist yet; balance still set */
      }
    }
    return NextResponse.json({ account }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
