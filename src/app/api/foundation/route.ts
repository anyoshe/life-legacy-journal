import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function asNullableString(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function asStringArray(value: unknown, maxItems: number, maxLen: number): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.slice(0, maxLen))
    .slice(0, maxItems);
}

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    foundation: {
      vision: user.vision ?? null,
      mission: user.mission ?? null,
      coreValues: user.coreValues ?? [],
      personalRules: user.personalRules ?? [],
    },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "Body must be a JSON object." }, { status: 400 });
    }
    body = raw as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const vision = asNullableString(body.vision, 10000);
  const mission = asNullableString(body.mission, 5000);
  const coreValues = asStringArray(body.coreValues, 20, 80);
  const personalRules = asStringArray(body.personalRules, 30, 300);

  if (
    vision === undefined &&
    mission === undefined &&
    coreValues === undefined &&
    personalRules === undefined
  ) {
    return NextResponse.json(
      {
        error: "No valid foundation fields found.",
        hint: "Send vision, mission, coreValues, and/or personalRules.",
        receivedKeys: Object.keys(body),
      },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(vision !== undefined ? { vision } : {}),
        ...(mission !== undefined ? { mission } : {}),
        ...(coreValues !== undefined ? { coreValues } : {}),
        ...(personalRules !== undefined ? { personalRules } : {}),
      },
      select: {
        vision: true,
        mission: true,
        coreValues: true,
        personalRules: true,
      },
    });

    return NextResponse.json({ foundation: updated });
  } catch (err) {
    console.error("Foundation save failed:", err);
    return NextResponse.json(
      { error: "Database could not save foundation fields." },
      { status: 500 },
    );
  }
}