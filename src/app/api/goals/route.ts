import { NextRequest, NextResponse } from "next/server";
import { GoalArea, GoalStatus, GoalType, Visibility } from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { getActiveCoupleForUser } from "@/lib/couple-access";
import { prisma } from "@/lib/prisma";

const goalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  area: z.nativeEnum(GoalArea),
  type: z.nativeEnum(GoalType),
  why: z.string().trim().max(2000).optional(),
  targetValue: z.number().finite().nonnegative().optional(),
  unit: z.string().trim().max(40).optional(),
  deadline: z.string().datetime().optional(),
  visibility: z.enum(["PRIVATE", "SHARED_WITH_PARTNER"]).default("PRIVATE"),
}).strict();

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { userId: user.id, status: { not: GoalStatus.ARCHIVED } },
    include: { milestones: { orderBy: { order: "asc" } }, actions: { orderBy: { dueDate: "asc" } } },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ goals: goals.map((goal) => ({
    ...goal,
    canEdit: true,
  })) });
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
  if (!parsed.success) return NextResponse.json({ error: "Please complete the required goal details." }, { status: 400 });

  const data = parsed.data;
  const couple = data.visibility === "SHARED_WITH_PARTNER" ? await getActiveCoupleForUser(user.id) : null;
  if (data.visibility === "SHARED_WITH_PARTNER" && !couple) {
    return NextResponse.json({ error: "Link an active partner before creating a shared goal." }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      coupleId: couple?.id,
      title: data.title,
      area: data.area,
      type: data.type,
      why: data.why || null,
      targetValue: data.targetValue,
      unit: data.unit || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      visibility: data.visibility === "SHARED_WITH_PARTNER" ? Visibility.SHARED_WITH_PARTNER : Visibility.PRIVATE,
    },
    include: { milestones: true, actions: true },
  });
  return NextResponse.json({ goal: { ...goal, canEdit: true } }, { status: 201 });
}
