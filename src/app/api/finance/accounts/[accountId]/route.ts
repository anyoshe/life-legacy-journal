import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ accountId: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  kind: z.string().trim().max(40).optional(),
  balance: z.number().finite().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  addFunds: z.number().finite().positive().optional(),
});

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accountId } = await params;
  const existing = await prisma.moneyAccount.findFirst({
    where: { id: accountId, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  const d = parsed.data;
  const balance =
    d.addFunds != null
      ? existing.balance + d.addFunds
      : d.balance !== undefined
        ? d.balance
        : existing.balance;

  const account = await prisma.moneyAccount.update({
    where: { id: accountId },
    data: {
      name: d.name ?? existing.name,
      kind: d.kind ?? existing.kind,
      balance,
      notes: d.notes === undefined ? existing.notes : d.notes,
    },
  });
  return NextResponse.json({ account });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accountId } = await params;
  const deleted = await prisma.moneyAccount.deleteMany({
    where: { id: accountId, userId: user.id },
  });
  if (!deleted.count) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
