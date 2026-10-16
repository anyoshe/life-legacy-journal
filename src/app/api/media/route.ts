import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Attach a media URL to an entry (no binary upload yet).
 * Full file upload can use R2/Uploadthing later with the same Media model.
 */
const createSchema = z
  .object({
    url: z.string().url().max(2000),
    type: z.enum(["image", "audio", "video", "document"]).default("image"),
    filename: z.string().trim().max(200).optional().nullable(),
    entryId: z.string().min(1).optional().nullable(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entryId = request.nextUrl.searchParams.get("entryId");
  const media = await prisma.media.findMany({
    where: {
      userId: user.id,
      ...(entryId ? { entryId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ media });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid media." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
  }

  const data = parsed.data;
  if (data.entryId) {
    const entry = await prisma.entry.findFirst({
      where: { id: data.entryId, userId: user.id },
    });
    if (!entry) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }
  }

  const media = await prisma.media.create({
    data: {
      userId: user.id,
      url: data.url,
      type: data.type,
      filename: data.filename || null,
      entryId: data.entryId || null,
    },
  });

  return NextResponse.json({ media }, { status: 201 });
}
