import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { calendarDateOnly, parseCalendarDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(2000).optional().nullable(),
    date: z.string().optional(),
    timeOfDay: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional()
      .nullable(),
    goalId: z.string().min(1).optional().nullable(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateParam = request.nextUrl.searchParams.get("date");
  const date = parseCalendarDate(dateParam) ?? calendarDateOnly();

  const todos = await prisma.todo.findMany({
    where: { userId: user.id, date },
    orderBy: [{ completed: "asc" }, { timeOfDay: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: { goal: { select: { id: true, title: true, area: true } } },
  });

  return NextResponse.json({ todos, date: date.toISOString().slice(0, 10) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid todo." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a title." }, { status: 400 });
  }

  const data = parsed.data;
  if (data.goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: data.goalId, userId: user.id },
    });
    if (!goal) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }
  }

  const date = parseCalendarDate(data.date) ?? calendarDateOnly();

  const todo = await prisma.todo.create({
    data: {
      userId: user.id,
      title: data.title,
      notes: data.notes || null,
      date,
      timeOfDay: data.timeOfDay || null,
      goalId: data.goalId || null,
    },
    include: { goal: { select: { id: true, title: true, area: true } } },
  });

  return NextResponse.json({ todo }, { status: 201 });
}
