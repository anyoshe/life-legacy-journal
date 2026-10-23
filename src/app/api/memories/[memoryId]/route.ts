import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ memoryId: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { memoryId } = await params;

  const memory = await prisma.memory.findFirst({
    where: { id: memoryId, userId: user.id },
  });
  if (!memory) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    if (memory.imageUrl.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", memory.imageUrl));
    }
  } catch {
    /* ignore */
  }

  await prisma.memory.delete({ where: { id: memoryId } });
  return new NextResponse(null, { status: 204 });
}
