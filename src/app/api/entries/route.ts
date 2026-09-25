import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Visibility, EntryType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      content,
      visibility = "PRIVATE",
      gratitudeItems = [],
      accomplishments = [],
      spiritualNote,
      marriageNote,
      financialNote,
      lessonOfDay,
      tomorrowPriority,
      prayer,
      mood,
      energy,
    } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Entry content is required" },
        { status: 400 }
      );
    }

    const entry = await prisma.entry.create({
      data: {
        userId: user.id,
        type: EntryType.DAILY,
        visibility: visibility === "SHARED_WITH_PARTNER" ? Visibility.SHARED_WITH_PARTNER : Visibility.PRIVATE,
        content: content.trim(),
        gratitudeItems: Array.isArray(gratitudeItems) ? gratitudeItems.filter(Boolean) : [],
        accomplishments: Array.isArray(accomplishments) ? accomplishments.filter(Boolean) : [],
        spiritualNote: spiritualNote?.trim() || null,
        marriageNote: marriageNote?.trim() || null,
        financialNote: financialNote?.trim() || null,
        lessonOfDay: lessonOfDay?.trim() || null,
        tomorrowPriority: tomorrowPriority?.trim() || null,
        prayer: prayer?.trim() || null,
        mood: mood?.trim() || null,
        energy: typeof energy === "number" ? energy : null,
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

    const entries = await prisma.entry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to fetch entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}
