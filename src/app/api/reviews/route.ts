import { NextRequest, NextResponse } from "next/server";
import { ReviewType } from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const contentSchema = z
  .object({
    wins: z.string().max(5000).optional().default(""),
    challenges: z.string().max(5000).optional().default(""),
    lessons: z.string().max(5000).optional().default(""),
    gratitude: z.string().max(5000).optional().default(""),
    relationships: z.string().max(5000).optional().default(""),
    growthAreas: z.string().max(5000).optional().default(""),
    focusNextWeek: z.string().max(2000).optional().default(""),
    focusNextMonth: z.string().max(2000).optional().default(""),
    energy: z.number().int().min(1).max(10).optional().nullable(),
    notes: z.string().max(5000).optional().default(""),
  })
  .passthrough();

const createSchema = z.object({
  type: z.nativeEnum(ReviewType).default(ReviewType.WEEKLY),
  periodStart: z.string(),
  periodEnd: z.string(),
  content: contentSchema,
});

export async function GET(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const typeParam = request.nextUrl.searchParams.get("type");
  const type =
    typeParam === "WEEKLY" || typeParam === "MONTHLY" || typeParam === "ANNUAL"
      ? (typeParam as ReviewType)
      : undefined;

  const reviews = await prisma.review.findMany({
    where: {
      userId: user.id,
      ...(type ? { type } : {}),
    },
    orderBy: { periodStart: "desc" },
    take: 30,
  });

  return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete the review fields." }, { status: 400 });
  }

  const data = parsed.data;
  const periodStart = new Date(data.periodStart);
  const periodEnd = new Date(data.periodEnd);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return NextResponse.json({ error: "Invalid review period." }, { status: 400 });
  }

  const existing = await prisma.review.findFirst({
    where: {
      userId: user.id,
      type: data.type,
      periodStart,
    },
  });

  if (existing) {
    const review = await prisma.review.update({
      where: { id: existing.id },
      data: { content: data.content, periodEnd },
    });
    return NextResponse.json({ review });
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      type: data.type,
      periodStart,
      periodEnd,
      content: data.content,
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}
