import { NextRequest, NextResponse } from "next/server";
import {
  GoalArea,
  GoalAlignment,
  GoalHorizon,
  GoalStatus,
  GoalType,
  Visibility,
} from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { getActiveCoupleForUser } from "@/lib/couple-access";
import { validateParentLink } from "@/lib/goal-hierarchy";
import { prisma } from "@/lib/prisma";
import { boardGoalsWhere } from "@/lib/finance-umbrella";

const goalSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    area: z.nativeEnum(GoalArea),
    type: z.nativeEnum(GoalType),
    why: z.string().trim().max(2000).optional(),
    targetValue: z.number().finite().nonnegative().optional(),
    unit: z.string().trim().max(40).optional(),
    deadline: z.string().datetime().optional(),
    visibility: z.enum(["PRIVATE", "SHARED_WITH_PARTNER"]).default("PRIVATE"),
    parentGoalId: z.string().min(1).nullable().optional(),
    horizon: z.nativeEnum(GoalHorizon).nullable().optional(),
    alignment: z.nativeEnum(GoalAlignment).optional(),
    alignmentNote: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parentOnly = request.nextUrl.searchParams.get("roots") === "1";
  const parentGoalId = request.nextUrl.searchParams.get("parentGoalId");

  const goals = await prisma.goal.findMany({
    where: {
      userId: user.id,
      financePlan: null, // line-item debts/savings only on /finance
      status: { not: GoalStatus.ARCHIVED },
      ...(parentOnly ? { parentGoalId: null } : {}),
      ...(parentGoalId ? { parentGoalId } : {}),
    },
    include: {
      milestones: { orderBy: { order: "asc" } },
      actions: { orderBy: { dueDate: "asc" } },
      parentGoal: { select: { id: true, title: true, horizon: true } },
      childGoals: {
        where: { status: { not: GoalStatus.ARCHIVED } },
        select: { id: true, title: true, horizon: true, status: true },
        take: 20,
      },
      _count: { select: { childGoals: true } },
    },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    goals: goals.map((goal) => ({
      ...goal,
      canEdit: true,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid goal details." }, { status: 400 });
  }

  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete the required goal details." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const couple =
    data.visibility === "SHARED_WITH_PARTNER"
      ? await getActiveCoupleForUser(user.id)
      : null;
  if (data.visibility === "SHARED_WITH_PARTNER" && !couple) {
    return NextResponse.json(
      { error: "Link an active partner before creating a shared goal." },
      { status: 400 },
    );
  }

  let parentGoalId: string | null = data.parentGoalId ?? null;
  if (parentGoalId) {
    const check = await validateParentLink({
      userId: user.id,
      parentGoalId,
      goalId: null,
      childHorizon: data.horizon ?? null,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
    parentGoalId = check.parentId;
  }

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      coupleId: couple?.id,
      parentGoalId,
      horizon: data.horizon ?? null,
      alignment: data.alignment ?? GoalAlignment.NONE,
      alignmentNote: data.alignmentNote?.trim() || null,
      title: data.title,
      area: data.area,
      type: data.type,
      why: data.why || null,
      targetValue: data.targetValue,
      unit: data.unit || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      visibility:
        data.visibility === "SHARED_WITH_PARTNER"
          ? Visibility.SHARED_WITH_PARTNER
          : Visibility.PRIVATE,
    },
    include: {
      milestones: true,
      actions: true,
      parentGoal: { select: { id: true, title: true, horizon: true } },
      childGoals: {
        select: { id: true, title: true, horizon: true, status: true },
      },
    },
  });

  return NextResponse.json({ goal: { ...goal, canEdit: true } }, { status: 201 });
}
