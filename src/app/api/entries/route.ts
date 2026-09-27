import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getActiveCoupleForUser } from "@/lib/couple-access";
import { prisma } from "@/lib/prisma";
import { Visibility, EntryType } from "@prisma/client";
import { z } from "zod";

const entrySchema = z.object({
  content: z.string().trim().min(1, "Entry content is required"),
  visibility: z
    .enum(["PRIVATE", "SHARED_WITH_PARTNER"])
    .default("PRIVATE"),
  gratitudeItems: z.array(z.string()).default([]),
  accomplishments: z.array(z.string()).default([]),
  spiritualNote: z.string().optional(),
  marriageNote: z.string().optional(),
  financialNote: z.string().optional(),
  lessonOfDay: z.string().optional(),
  tomorrowPriority: z.string().optional(),
  prayer: z.string().optional(),
  mood: z.string().optional(),
  energy: z.number().int().min(1).max(10).nullable().optional(),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid entry details." }, { status: 400 });
    }
    const parsed = entrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid entry details." }, { status: 400 });
    }

    const data = parsed.data;
    const isShared = data.visibility === "SHARED_WITH_PARTNER";
    const couple = isShared ? await getActiveCoupleForUser(user.id) : null;
    if (isShared && !couple) {
      return NextResponse.json({ error: "Link an active partner before sharing an entry." }, { status: 400 });
    }

    const entry = await prisma.entry.create({
      data: {
        userId: user.id,
        coupleId: couple?.id,
        type: EntryType.DAILY,
        visibility: isShared ? Visibility.SHARED_WITH_PARTNER : Visibility.PRIVATE,
        content: data.content,
        gratitudeItems: data.gratitudeItems.filter(Boolean),
        accomplishments: data.accomplishments.filter(Boolean),
        spiritualNote: data.spiritualNote?.trim() || null,
        marriageNote: data.marriageNote?.trim() || null,
        financialNote: data.financialNote?.trim() || null,
        lessonOfDay: data.lessonOfDay?.trim() || null,
        tomorrowPriority: data.tomorrowPriority?.trim() || null,
        prayer: data.prayer?.trim() || null,
        mood: data.mood?.trim() || null,
        energy: data.energy ?? null,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Failed to create entry:", error);
    return NextResponse.json(
      { error: "Failed to save entry" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const couple = await getActiveCoupleForUser(user.id);
    const [ownedEntries, sharedEntries] = await Promise.all([
      prisma.entry.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      couple
        ? prisma.entry.findMany({
            where: {
              userId: { not: user.id },
              coupleId: couple.id,
              visibility: Visibility.SHARED_WITH_PARTNER,
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
    ]);
    const entries = [...ownedEntries, ...sharedEntries]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 20);

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to fetch entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}
