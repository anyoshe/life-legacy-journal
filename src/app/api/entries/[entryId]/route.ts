import { NextRequest, NextResponse } from "next/server";
import { Visibility } from "@prisma/client";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { canAccessSharedResource, getActiveCoupleForUser } from "@/lib/couple-access";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  content: z.string().trim().min(1).optional(),
  visibility: z.enum(["PRIVATE", "SHARED_WITH_PARTNER"]).optional(),
}).strict();

type RouteContext = { params: Promise<{ entryId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;
  let entry = await prisma.entry.findFirst({ where: { id: entryId, userId: user.id } });

  if (!entry) {
    const sharedEntry = await prisma.entry.findFirst({
      where: { id: entryId, visibility: Visibility.SHARED_WITH_PARTNER },
    });
    if (!sharedEntry || !(await canAccessSharedResource(user.id, sharedEntry))) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }
    entry = sharedEntry;
  }

  return NextResponse.json({ entry });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid entry update." }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return NextResponse.json({ error: "Invalid entry update." }, { status: 400 });
  }

  const entry = await prisma.entry.findFirst({ where: { id: entryId, userId: user.id } });
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const visibility = parsed.data.visibility;
  const couple = visibility === "SHARED_WITH_PARTNER"
    ? await getActiveCoupleForUser(user.id)
    : null;
  const resolvedCoupleId = visibility === "PRIVATE"
    ? null
    : visibility === "SHARED_WITH_PARTNER"
      ? couple?.id ?? null
      : entry.coupleId;
  if (visibility === "SHARED_WITH_PARTNER" && !resolvedCoupleId) {
    return NextResponse.json({ error: "Link an active partner before sharing an entry." }, { status: 400 });
  }

  const updated = await prisma.entry.updateMany({
    where: { id: entryId, userId: user.id },
    data: {
      ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
      ...(visibility !== undefined
        ? {
            visibility: visibility === "SHARED_WITH_PARTNER" ? Visibility.SHARED_WITH_PARTNER : Visibility.PRIVATE,
            coupleId: resolvedCoupleId,
          }
        : {}),
    },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const updatedEntry = await prisma.entry.findFirst({ where: { id: entryId, userId: user.id } });
  return NextResponse.json({ entry: updatedEntry });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;
  const deleted = await prisma.entry.deleteMany({ where: { id: entryId, userId: user.id } });
  if (deleted.count === 0) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
