import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getActiveCoupleForUser } from "@/lib/couple-access";
import { prisma } from "@/lib/prisma";
import { Visibility, EntryType, Prisma } from "@prisma/client";
import { z } from "zod";

const entrySchema = z
  .object({
    content: z.string().trim().min(1, "Entry content is required"),
    visibility: z.enum(["PRIVATE", "SHARED_WITH_PARTNER"]).default("PRIVATE"),
    type: z.nativeEnum(EntryType).optional(),
    title: z.string().trim().max(200).optional(),
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
    tags: z.array(z.string()).optional(),
  })
  .strict();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(200).optional(),
  visibility: z.enum(["PRIVATE", "SHARED_WITH_PARTNER", "ALL"]).optional(),
  type: z.nativeEnum(EntryType).optional(),
  mood: z.string().trim().max(80).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  scope: z.enum(["mine", "shared", "all"]).default("all"),
});

function parseDayBound(value: string | undefined, endOfDay: boolean) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

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
      return NextResponse.json(
        { error: "Link an active partner before sharing an entry." },
        { status: 400 },
      );
    }

    const entry = await prisma.entry.create({
      data: {
        userId: user.id,
        coupleId: couple?.id,
        type: data.type ?? EntryType.DAILY,
        title: data.title?.trim() || null,
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
        tags: data.tags?.filter(Boolean) ?? [],
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Failed to create entry:", error);
    return NextResponse.json({ error: "Failed to save entry" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = listQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid list filters." }, { status: 400 });
    }

    const { page, pageSize, q, visibility, type, mood, from, to, scope } = parsed.data;
    const couple = await getActiveCoupleForUser(user.id);
    const fromDate = parseDayBound(from, false);
    const toDate = parseDayBound(to, true);

    const dateFilter: Prisma.DateTimeFilter | undefined =
      fromDate || toDate
        ? {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        : undefined;

    const textFilter: Prisma.EntryWhereInput | undefined = q
      ? {
          OR: [
            { content: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { mood: { contains: q, mode: "insensitive" } },
            { lessonOfDay: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined;

    const commonFilters: Prisma.EntryWhereInput = {
      ...(type ? { type } : {}),
      ...(mood ? { mood: { contains: mood, mode: "insensitive" } } : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
      ...(textFilter ?? {}),
    };

    const ownedWhere: Prisma.EntryWhereInput = {
      userId: user.id,
      ...(visibility && visibility !== "ALL" ? { visibility: visibility as Visibility } : {}),
      ...commonFilters,
    };

    const sharedWhere: Prisma.EntryWhereInput | null = couple
      ? {
          userId: { not: user.id },
          coupleId: couple.id,
          visibility: Visibility.SHARED_WITH_PARTNER,
          ...commonFilters,
          ...(visibility === "PRIVATE" ? { id: "__none__" } : {}),
        }
      : null;

    let where: Prisma.EntryWhereInput;
    if (scope === "mine") {
      where = ownedWhere;
    } else if (scope === "shared") {
      where = sharedWhere ?? { id: "__none__" };
    } else {
      where = sharedWhere ? { OR: [ownedWhere, sharedWhere] } : ownedWhere;
    }

    const [total, entries] = await Promise.all([
      prisma.entry.count({ where }),
      prisma.entry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          coupleId: true,
          type: true,
          visibility: true,
          title: true,
          content: true,
          mood: true,
          energy: true,
          tags: true,
          gratitudeItems: true,
          accomplishments: true,
          lessonOfDay: true,
          tomorrowPriority: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const items = entries.map((entry) => ({
      ...entry,
      isOwner: entry.userId === user.id,
      preview:
        entry.content.length > 180 ? `${entry.content.slice(0, 180).trim()}…` : entry.content,
    }));

    return NextResponse.json({
      entries: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("Failed to fetch entries:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}
