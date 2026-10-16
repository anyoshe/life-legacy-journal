import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(20000),
    source: z.string().trim().max(120).optional().nullable(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
  })
  .strict();

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lessons = await prisma.lesson.findMany({
    where: { userId: user.id },
    orderBy: { number: "desc" },
  });

  return NextResponse.json({ lessons });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid lesson." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Title and content are required." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const last = await prisma.lesson.findFirst({
    where: { userId: user.id },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const number = (last?.number ?? 0) + 1;

  const lesson = await prisma.lesson.create({
    data: {
      userId: user.id,
      number,
      title: data.title,
      content: data.content,
      source: data.source?.trim() || null,
      tags: (data.tags ?? []).map((t) => t.trim()).filter(Boolean),
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
