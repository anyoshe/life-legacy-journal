import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ experienceId: string }> };

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    whatHappened: z.string().trim().min(1).max(20000).optional(),
    location: z.string().trim().max(200).nullable().optional(),
    peopleInvolved: z.array(z.string().trim().max(80)).max(20).optional(),
    feelings: z.string().trim().max(500).nullable().optional(),
    outcome: z.string().trim().max(5000).nullable().optional(),
    lesson: z.string().trim().max(5000).nullable().optional(),
    wouldDoDifferently: z.string().trim().max(5000).nullable().optional(),
    remember: z.string().trim().max(5000).nullable().optional(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
  })
  .strict();

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { experienceId } = await params;
  const deleted = await prisma.experience.deleteMany({
    where: { id: experienceId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { experienceId } = await params;
  const existing = await prisma.experience.findFirst({
    where: { id: experienceId, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  const d = parsed.data;
  const experience = await prisma.experience.update({
    where: { id: experienceId },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.whatHappened !== undefined ? { whatHappened: d.whatHappened } : {}),
      ...(d.location !== undefined ? { location: d.location } : {}),
      ...(d.peopleInvolved !== undefined ? { peopleInvolved: d.peopleInvolved } : {}),
      ...(d.feelings !== undefined ? { feelings: d.feelings } : {}),
      ...(d.outcome !== undefined ? { outcome: d.outcome } : {}),
      ...(d.lesson !== undefined ? { lesson: d.lesson } : {}),
      ...(d.wouldDoDifferently !== undefined
        ? { wouldDoDifferently: d.wouldDoDifferently }
        : {}),
      ...(d.remember !== undefined ? { remember: d.remember } : {}),
      ...(d.tags !== undefined ? { tags: d.tags } : {}),
    },
  });
  return NextResponse.json({ experience });
}
