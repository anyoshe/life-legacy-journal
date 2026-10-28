import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(1),
  principal: z.number().finite().positive(),
  amountReceived: z.number().finite().nonnegative().optional(),
  currency: z.string().optional(),
  reason: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const receiveSchema = z.object({
  id: z.string().min(1),
  amount: z.number().finite().positive(),
  note: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const debtors = await prisma.debtor.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const totalPrincipal = debtors.reduce((s, d) => s + d.principal, 0);
    const totalReceived = debtors.reduce((s, d) => s + d.amountReceived, 0);
    const totalBalance = debtors.reduce((s, d) => s + d.balance, 0);
    return NextResponse.json({
      debtors,
      totals: { totalPrincipal, totalReceived, totalBalance, count: debtors.length },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error: "Debtors table missing. Run prisma db push.",
        debtors: [],
        totals: { totalPrincipal: 0, totalReceived: 0, totalBalance: 0, count: 0 },
      },
      { status: 200 },
    );
  }
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

  // Collect payment from debtor
  if ((body as { action?: string }).action === "receive") {
    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "id and amount required." }, { status: 400 });
    }
    try {
      const existing = await prisma.debtor.findFirst({
        where: { id: parsed.data.id, userId: user.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
      const received = existing.amountReceived + parsed.data.amount;
      const balance = Math.max(0, existing.principal - received);
      const updated = await prisma.debtor.update({
        where: { id: existing.id },
        data: {
          amountReceived: received,
          balance,
          notes: parsed.data.note
            ? `${existing.notes || ""}\nReceived ${parsed.data.amount}: ${parsed.data.note}`.trim()
            : existing.notes,
        },
      });
      return NextResponse.json({ debtor: updated });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Could not record receipt." }, { status: 500 });
    }
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Name and amount owed to you are required." },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const received = data.amountReceived ?? 0;
  const balance = Math.max(0, data.principal - received);

  try {
    const debtor = await prisma.debtor.create({
      data: {
        userId: user.id,
        name: data.name,
        principal: data.principal,
        amountReceived: received,
        balance,
        currency: data.currency || "KES",
        reason: data.reason || null,
        dueDate: data.dueDate
          ? new Date(
              data.dueDate.includes("T")
                ? data.dueDate
                : data.dueDate + "T12:00:00.000Z",
            )
          : null,
        notes: data.notes || null,
      },
    });
    return NextResponse.json({ debtor }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not save debtor. Run prisma db push for debtors table." },
      { status: 500 },
    );
  }
}
