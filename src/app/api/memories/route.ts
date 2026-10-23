import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { memoryLimitForTier } from "@/lib/memories";

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memories = await prisma.memory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const tier = (user as { subscriptionTier?: string }).subscriptionTier ?? "FREE";
  const limit = memoryLimitForTier(tier);
  const count = memories.length;

  return NextResponse.json({
    memories,
    quota: { used: count, limit, tier, remaining: Math.max(0, limit - count) },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = (user as { subscriptionTier?: string }).subscriptionTier ?? "FREE";
  const limit = memoryLimitForTier(tier);
  const count = await prisma.memory.count({ where: { userId: user.id } });
  if (count >= limit) {
    return NextResponse.json(
      {
        error: `Free plan allows ${limit} photos. Upgrade to store more memories.`,
        code: "QUOTA_EXCEEDED",
        quota: { used: count, limit, tier },
      },
      { status: 402 },
    );
  }

  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  const story = String(form.get("story") || "").trim();
  const kindRaw = String(form.get("kind") || "MEMORY");
  const kind = kindRaw === "ACHIEVEMENT" ? "ACHIEVEMENT" : "MEMORY";
  const file = form.get("photo") as File | null;

  if (!title || !story) {
    return NextResponse.json(
      { error: "Title and explanation (what it reminds you of) are required." },
      { status: 400 },
    );
  }
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a photo." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo must be under 5 MB." }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const dir = path.join(process.cwd(), "public", "uploads", "memories", user.id);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);
  const imageUrl = `/uploads/memories/${user.id}/${filename}`;

  const memory = await prisma.memory.create({
    data: {
      userId: user.id,
      title,
      story,
      kind,
      imageUrl,
      filename: file.name || filename,
      size: file.size,
    },
  });

  return NextResponse.json(
    {
      memory,
      quota: {
        used: count + 1,
        limit,
        tier,
        remaining: Math.max(0, limit - count - 1),
      },
    },
    { status: 201 },
  );
}
