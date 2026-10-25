import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  periodStart: z.string().min(1), // YYYY-MM-DD
  amount: z.number().finite().positive(),
  currency: z.string().optional(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function startOfPeriod(period: string, d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (period === "MONTHLY") return new Date(Date.UTC(y, m, 1));
  if (period === "WEEKLY") {
    const wd = d.getUTCDay();
    const diff = wd === 0 ? -6 : 1 - wd;
    return new Date(Date.UTC(y, m, day + diff));
  }
  return new Date(Date.UTC(y, m, day));
}

export async function GET(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = request.nextUrl.searchParams.get("period") || undefined;

  try {
    const budgets = await prisma.budget.findMany({
      where: {
        userId: user.id,
        ...(period ? { period: period as "DAILY" | "WEEKLY" | "MONTHLY" } : {}),
      },
      orderBy: { periodStart: "desc" },
      take: 40,
    });
    return NextResponse.json({ budgets });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Budgets table missing. Run prisma db push.", budgets: [] },
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Period, start date, and amount are required." },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const raw = new Date(
    data.periodStart.includes("T")
      ? data.periodStart
      : data.periodStart + "T12:00:00.000Z",
  );
  const periodStart = startOfPeriod(data.period, raw);

  try {
    const budget = await prisma.budget.create({
      data: {
        userId: user.id,
        period: data.period,
        periodStart,
        amount: data.amount,
        currency: data.currency || "KES",
        category: data.category || null,
        notes: data.notes || null,
      },
    });
    return NextResponse.json({ budget }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not save budget. Run prisma db push for budgets table." },
      { status: 500 },
    );
  }
}
