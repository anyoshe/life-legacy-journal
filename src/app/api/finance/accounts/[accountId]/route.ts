import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ accountId: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  kind: z.string().trim().max(40).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accountId } = await params;

  const existing = await prisma.moneyAccount.findFirst({
    where: { id: accountId, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid account details." }, { status: 400 });
  }
  const d = parsed.data;
  const account = await prisma.moneyAccount.update({
    where: { id: accountId },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.kind !== undefined ? { kind: d.kind } : {}),
      ...(d.currency !== undefined ? { currency: d.currency } : {}),
      ...(d.notes !== undefined ? { notes: d.notes } : {}),
    },
  });
  return NextResponse.json({ account });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accountId } = await params;

  const existing = await prisma.moneyAccount.findFirst({
    where: { id: accountId, userId: user.id },
    include: { _count: { select: { expenses: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (existing._count.expenses > 0) {
    return NextResponse.json(
      {
        error:
          "This account has expenses linked to it. Remove or reassign those expenses before deleting, or keep the account with zero balance.",
      },
      { status: 400 },
    );
  }

  await prisma.moneyAccount.delete({ where: { id: accountId } });
  return NextResponse.json({ ok: true });
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accountId } = await params;

  const account = await prisma.moneyAccount.findFirst({
    where: { id: accountId, userId: user.id },
    include: {
      topUps: { orderBy: { occurredAt: "desc" }, take: 50 },
    },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  return NextResponse.json({ account });
}
