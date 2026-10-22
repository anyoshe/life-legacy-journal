import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().max(80).optional().nullable(),
  value: z.number().finite().nonnegative().default(0),
  currency: z.string().trim().min(1).max(8).default("KES"),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assets = await prisma.personalAsset.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name required." }, { status: 400 });
  }
  const asset = await prisma.personalAsset.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      value: parsed.data.value,
      currency: parsed.data.currency,
      notes: parsed.data.notes ?? null,
    },
  });
  return NextResponse.json({ asset }, { status: 201 });
}
