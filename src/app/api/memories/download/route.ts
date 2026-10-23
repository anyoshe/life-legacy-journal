import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * JSON export of all memories (metadata + image URLs).
 * Client can download individual photos; full ZIP can be added later with archiver.
 */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memories = await prisma.memory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    count: memories.length,
    memories: memories.map((m) => ({
      title: m.title,
      story: m.story,
      kind: m.kind,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-memories-${Date.now()}.json"`,
    },
  });
}
