import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ dreamId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dreamId } = await params;
  const deleted = await prisma.dream.deleteMany({
    where: { id: dreamId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Dream not found." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
