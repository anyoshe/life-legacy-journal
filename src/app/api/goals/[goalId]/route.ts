import { NextRequest, NextResponse } from "next/server";
import { GoalStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  currentValue: z.number().finite().nonnegative().optional(),
  status: z.nativeEnum(GoalStatus).optional(),
  milestoneId: z.string().min(1).optional(),
  actionId: z.string().min(1).optional(),
  completed: z.boolean().optional(),
}).strict();

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goalId } = await params;
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: user.id },
    include: { milestones: { orderBy: { order: "asc" } }, actions: { orderBy: { dueDate: "asc" } } },
  });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  return NextResponse.json({ goal: { ...goal, canEdit: true } });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { goalId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid goal update." }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid goal update." }, { status: 400 });

  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id } });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  const data = parsed.data;

  if (data.milestoneId) {
    const milestone = await prisma.milestone.findFirst({ where: { id: data.milestoneId, goalId } });
    if (!milestone) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    const completed = data.completed ?? !milestone.completed;
    await prisma.milestone.update({ where: { id: milestone.id }, data: { completed, completedAt: completed ? new Date() : null } });
  } else if (data.actionId) {
    const action = await prisma.action.findFirst({ where: { id: data.actionId, goalId } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    const completed = data.completed ?? !action.completed;
    await prisma.action.update({ where: { id: action.id }, data: { completed, completedAt: completed ? new Date() : null } });
  } else {
    await prisma.goal.update({ where: { id: goal.id }, data: { currentValue: data.currentValue, status: data.status, lastReviewedAt: new Date() } });
  }

  const updated = await prisma.goal.findUnique({
    where: { id: goal.id },
    include: { milestones: { orderBy: { order: "asc" } }, actions: { orderBy: { dueDate: "asc" } } },
  });
  return NextResponse.json({ goal: updated ? { ...updated, canEdit: true } : updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goalId } = await params;
  const deleted = await prisma.goal.deleteMany({
    where: { id: goalId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
