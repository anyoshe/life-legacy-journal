import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ reviewId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await params;
  const review = await prisma.review.findFirst({
    where: { id: reviewId, userId: user.id },
  });
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  return NextResponse.json({ review });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await params;
  const deleted = await prisma.review.deleteMany({
    where: { id: reviewId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
