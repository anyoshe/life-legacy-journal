import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ lessonId: string }> };

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).max(20000).optional(),
    source: z.string().trim().max(120).nullable().optional(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
  })
  .strict();

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, userId: user.id },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lesson });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const existing = await prisma.lesson.findFirst({
    where: { id: lessonId, userId: user.id },
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

  const data = parsed.data;
  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.source !== undefined ? { source: data.source } : {}),
      ...(data.tags !== undefined
        ? { tags: data.tags.map((t) => t.trim()).filter(Boolean) }
        : {}),
    },
  });

  return NextResponse.json({ lesson });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const deleted = await prisma.lesson.deleteMany({
    where: { id: lessonId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
