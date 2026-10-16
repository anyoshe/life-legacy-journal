import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    whatHappened: z.string().trim().min(1).max(20000),
    date: z.string().optional(),
    location: z.string().trim().max(200).optional().nullable(),
    peopleInvolved: z.array(z.string().trim().max(80)).max(20).optional(),
    feelings: z.string().trim().max(500).optional().nullable(),
    outcome: z.string().trim().max(5000).optional().nullable(),
    lesson: z.string().trim().max(5000).optional().nullable(),
    wouldDoDifferently: z.string().trim().max(5000).optional().nullable(),
    remember: z.string().trim().max(5000).optional().nullable(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
  })
  .strict();

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const experiences = await prisma.experience.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ experiences });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid experience." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Title and what happened are required." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  let date = new Date();
  if (data.date) {
    date = new Date(data.date);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }
  }

  const experience = await prisma.experience.create({
    data: {
      userId: user.id,
      title: data.title,
      whatHappened: data.whatHappened,
      date,
      location: data.location || null,
      peopleInvolved: data.peopleInvolved ?? [],
      feelings: data.feelings || null,
      outcome: data.outcome || null,
      lesson: data.lesson || null,
      wouldDoDifferently: data.wouldDoDifferently || null,
      remember: data.remember || null,
      tags: data.tags ?? [],
    },
  });

  return NextResponse.json({ experience }, { status: 201 });
}
