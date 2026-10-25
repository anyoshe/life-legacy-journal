import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUILTIN_EXPENSE_CATEGORIES } from "@/lib/expense-categories";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  scope: z.enum(["INDIVIDUAL", "FAMILY", "BOTH"]).optional(),
});

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let custom: { id: string; name: string; scope: string }[] = [];
  try {
    custom = await prisma.expenseCategory.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, scope: true },
    });
  } catch {
    custom = [];
  }

  const builtin = BUILTIN_EXPENSE_CATEGORIES.map((c) => ({
    id: `builtin:${c.name}`,
    name: c.name,
    scope: c.scope,
    builtin: true as const,
  }));
  const customMapped = custom.map((c) => ({
    ...c,
    builtin: false as const,
  }));

  // Prefer custom name if same as builtin
  const names = new Set(customMapped.map((c) => c.name.toLowerCase()));
  const merged = [
    ...customMapped,
    ...builtin.filter((b) => !names.has(b.name.toLowerCase())),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ categories: merged });
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
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }

  try {
    const cat = await prisma.expenseCategory.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        scope: parsed.data.scope || "BOTH",
      },
    });
    return NextResponse.json({ category: cat }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "Could not add category (maybe it already exists, or run prisma db push).",
      },
      { status: 400 },
    );
  }
}
