import { NextRequest, NextResponse } from "next/server";
import { Visibility } from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { getActiveCoupleForUser } from "@/lib/couple-access";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ letterId: string }> };

const patchSchema = z
  .object({
    recipient: z.string().trim().min(1).max(80).optional(),
    title: z.string().trim().max(200).nullable().optional(),
    content: z.string().trim().min(1).max(50000).optional(),
    visibility: z.enum(["PRIVATE", "SHARED_WITH_PARTNER"]).optional(),
    isSealed: z.boolean().optional(),
    openDate: z.string().nullable().optional(),
  })
  .strict();

async function canAccessLetter(letterId: string, userId: string) {
  const letter = await prisma.letter.findUnique({ where: { id: letterId } });
  if (!letter) return null;
  if (letter.userId === userId) return { letter, mine: true };

  if (letter.visibility !== Visibility.SHARED_WITH_PARTNER || !letter.coupleId) {
    return null;
  }
  const couple = await getActiveCoupleForUser(userId);
  if (!couple || couple.id !== letter.coupleId) return null;
  return { letter, mine: false };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { letterId } = await params;
  const access = await canAccessLetter(letterId, user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { letter, mine } = access;
  const open =
    mine ||
    !letter.isSealed ||
    (letter.openDate != null && letter.openDate.getTime() <= Date.now());

  return NextResponse.json({
    letter: {
      ...letter,
      content: open ? letter.content : null,
      isMine: mine,
      isReadable: open,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { letterId } = await params;
  const existing = await prisma.letter.findFirst({
    where: { id: letterId, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Only the author can edit." }, { status: 403 });
  }

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
  let coupleId = existing.coupleId;
  let visibility = existing.visibility;

  if (data.visibility === "SHARED_WITH_PARTNER") {
    const couple = await getActiveCoupleForUser(user.id);
    if (!couple) {
      return NextResponse.json(
        { error: "Link an active partner before sharing." },
        { status: 400 },
      );
    }
    coupleId = couple.id;
    visibility = Visibility.SHARED_WITH_PARTNER;
  } else if (data.visibility === "PRIVATE") {
    coupleId = null;
    visibility = Visibility.PRIVATE;
  }

  let openDate = existing.openDate;
  if (data.openDate !== undefined) {
    if (data.openDate === null || data.openDate === "") openDate = null;
    else {
      openDate = new Date(data.openDate);
      if (Number.isNaN(openDate.getTime())) {
        return NextResponse.json({ error: "Invalid open date." }, { status: 400 });
      }
    }
  }

  const letter = await prisma.letter.update({
    where: { id: letterId },
    data: {
      ...(data.recipient !== undefined ? { recipient: data.recipient } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.isSealed !== undefined ? { isSealed: data.isSealed } : {}),
      visibility,
      coupleId,
      openDate,
    },
  });

  return NextResponse.json({ letter });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { letterId } = await params;
  const deleted = await prisma.letter.deleteMany({
    where: { id: letterId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
