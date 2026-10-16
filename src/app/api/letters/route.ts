import { NextRequest, NextResponse } from "next/server";
import { Visibility } from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { getActiveCoupleForUser } from "@/lib/couple-access";
import { prisma } from "@/lib/prisma";

const createSchema = z
  .object({
    recipient: z.string().trim().min(1).max(80),
    title: z.string().trim().max(200).optional().nullable(),
    content: z.string().trim().min(1).max(50000),
    visibility: z.enum(["PRIVATE", "SHARED_WITH_PARTNER"]).default("PRIVATE"),
    isSealed: z.boolean().optional(),
    openDate: z.string().optional().nullable(),
  })
  .strict();

function isOpen(letter: { isSealed: boolean; openDate: Date | null }, now = new Date()) {
  if (!letter.isSealed) return true;
  if (!letter.openDate) return false;
  return letter.openDate.getTime() <= now.getTime();
}

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const couple = await getActiveCoupleForUser(user.id);

  const own = await prisma.letter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  let shared: typeof own = [];
  if (couple) {
    const partnerId =
      couple.partnerAId === user.id ? couple.partnerBId : couple.partnerAId;
    if (partnerId) {
      shared = await prisma.letter.findMany({
        where: {
          userId: partnerId,
          coupleId: couple.id,
          visibility: Visibility.SHARED_WITH_PARTNER,
        },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  const mapLetter = (
    letter: (typeof own)[0],
    mine: boolean,
  ) => {
    const open = isOpen(letter);
    const canReadBody = mine || open;
    return {
      id: letter.id,
      recipient: letter.recipient,
      title: letter.title,
      content: canReadBody ? letter.content : null,
      isSealed: letter.isSealed,
      openDate: letter.openDate,
      visibility: letter.visibility,
      createdAt: letter.createdAt,
      updatedAt: letter.updatedAt,
      isMine: mine,
      isReadable: canReadBody,
      sealedUntil:
        !canReadBody && letter.openDate
          ? letter.openDate.toISOString()
          : null,
    };
  };

  return NextResponse.json({
    letters: [
      ...own.map((l) => mapLetter(l, true)),
      ...shared.map((l) => mapLetter(l, false)),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid letter." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Recipient and content are required." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const isShared = data.visibility === "SHARED_WITH_PARTNER";
  const couple = isShared ? await getActiveCoupleForUser(user.id) : null;
  if (isShared && !couple) {
    return NextResponse.json(
      { error: "Link an active partner before sharing a letter." },
      { status: 400 },
    );
  }

  let openDate: Date | null = null;
  if (data.openDate) {
    openDate = new Date(data.openDate);
    if (Number.isNaN(openDate.getTime())) {
      return NextResponse.json({ error: "Invalid open date." }, { status: 400 });
    }
  }

  const letter = await prisma.letter.create({
    data: {
      userId: user.id,
      coupleId: couple?.id ?? null,
      recipient: data.recipient,
      title: data.title?.trim() || null,
      content: data.content,
      visibility: isShared
        ? Visibility.SHARED_WITH_PARTNER
        : Visibility.PRIVATE,
      isSealed: data.isSealed ?? false,
      openDate,
    },
  });

  return NextResponse.json({ letter }, { status: 201 });
}
