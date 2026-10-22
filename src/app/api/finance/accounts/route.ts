import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.string().trim().max(40).default("CASH"),
  currency: z.string().trim().min(1).max(8).default("KES"),
  balance: z.number().finite().default(0),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accounts = await prisma.moneyAccount.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ accounts });
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
    return NextResponse.json({ error: "Name and balance required." }, { status: 400 });
  }
  const account = await prisma.moneyAccount.create({
    data: { userId: user.id, ...parsed.data, notes: parsed.data.notes ?? null },
  });
  return NextResponse.json({ account }, { status: 201 });
}
