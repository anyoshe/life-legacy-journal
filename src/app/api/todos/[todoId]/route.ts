import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ todoId: string }> };

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    timeOfDay: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .optional(),
    completed: z.boolean().optional(),
    goalId: z.string().min(1).nullable().optional(),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { todoId } = await params;
  const existing = await prisma.todo.findFirst({
    where: { id: todoId, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Todo not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
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

  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.timeOfDay !== undefined) update.timeOfDay = data.timeOfDay;
  if (data.goalId !== undefined) update.goalId = data.goalId;
  if (data.completed !== undefined) {
    update.completed = data.completed;
    update.completedAt = data.completed ? new Date() : null;
  }

  const todo = await prisma.todo.update({
    where: { id: todoId },
    data: update,
    include: { goal: { select: { id: true, title: true, area: true } } },
  });

  return NextResponse.json({ todo });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { todoId } = await params;
  const deleted = await prisma.todo.deleteMany({
    where: { id: todoId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
