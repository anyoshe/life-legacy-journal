import { NextRequest, NextResponse } from "next/server";
import { DreamKind } from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z
  .object({
    kind: z.nativeEnum(DreamKind),
    title: z.string().trim().max(200).optional().nullable(),
    content: z.string().trim().min(1).max(20000),
    date: z.string().optional(), // YYYY-MM-DD — when dreamed / intended
    timeOfDay: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional()
      .nullable(), // HH:mm — when dreamed
    feelings: z.string().trim().max(500).optional().nullable(),
    meaning: z.string().trim().max(5000).optional().nullable(),
    tags: z.array(z.string().trim().max(40)).max(12).optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kindParam = request.nextUrl.searchParams.get("kind");
  const kind =
    kindParam === "DAY_INTENTION" || kindParam === "NIGHT_DREAM"
      ? (kindParam as DreamKind)
      : undefined;

  const dreams = await prisma.dream.findMany({
    where: {
      userId: user.id,
      ...(kind ? { kind } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 80,
  });

  return NextResponse.json({ dreams });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid dream details." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please write your dream content and choose day or night." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  let date = new Date();
  if (data.date) {
    const [y, m, d] = data.date.split("-").map(Number);
    if (y && m && d) date = new Date(Date.UTC(y, m - 1, d));
  } else {
    date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  const createData: Record<string, unknown> = {
    userId: user.id,
    kind: data.kind,
    title: data.title?.trim() || null,
    content: data.content.trim(),
    date,
    feelings: data.feelings?.trim() || null,
    meaning: data.meaning?.trim() || null,
    tags: data.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
  };

  // timeOfDay only if column exists (after db push)
  if (data.timeOfDay) {
    createData.timeOfDay = data.timeOfDay;
  }

  try {
    const dream = await prisma.dream.create({
      data: createData as Parameters<typeof prisma.dream.create>[0]["data"],
    });
    return NextResponse.json({ dream }, { status: 201 });
  } catch (err) {
    // Retry without timeOfDay if column not migrated yet
    console.error("Dream create failed, retry without timeOfDay:", err);
    delete createData.timeOfDay;
    try {
      const dream = await prisma.dream.create({
        data: createData as Parameters<typeof prisma.dream.create>[0]["data"],
      });
      return NextResponse.json({ dream }, { status: 201 });
    } catch (err2) {
      console.error("Dream create failed:", err2);
      return NextResponse.json(
        { error: "Could not save dream. Ensure Dream model exists (prisma db push)." },
        { status: 500 },
      );
    }
  }
}
