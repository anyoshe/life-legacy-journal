import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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

type Detail = { title: string; body: string };

function asDetails(value: unknown, max = 20): Detail[] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value)) return undefined;
  const out: Detail[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.title === "string" ? rec.title.trim().slice(0, 120) : "";
    const body = typeof rec.body === "string" ? rec.body.trim().slice(0, 2000) : "";
    if (!title && !body) continue;
    out.push({ title: title || "Untitled", body });
    if (out.length >= max) break;
  }
  return out;
}

function payload(user: Record<string, unknown>) {
  const asDet = (v: unknown): Detail[] =>
    Array.isArray(v) ? (v as Detail[]) : [];
  return {
    vision: (user.vision as string | null) ?? null,
    visionHeadline: (user.visionHeadline as string | null) ?? null,
    visionPillars: (user.visionPillars as string[]) ?? [],
    visionQuote: (user.visionQuote as string | null) ?? null,
    mission: (user.mission as string | null) ?? null,
    coreValues: (user.coreValues as string[]) ?? [],
    valuesHeadline: (user.valuesHeadline as string | null) ?? null,
    valuesQuote: (user.valuesQuote as string | null) ?? null,
    coreValueDetails: asDet(user.coreValueDetails),
    personalRules: (user.personalRules as string[]) ?? [],
    rulesHeadline: (user.rulesHeadline as string | null) ?? null,
    rulesSubtitle: (user.rulesSubtitle as string | null) ?? null,
    ruleDetails: asDet(user.ruleDetails),
    rulesNonNegotiable: (user.rulesNonNegotiable as string | null) ?? null,
    rulesDailyCommitment: (user.rulesDailyCommitment as string | null) ?? null,
  };
}

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ foundation: payload(user as unknown as Record<string, unknown>) });
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

  const fields = {
    vision: asNullableString(body.vision, 10000),
    visionHeadline: asNullableString(body.visionHeadline, 200),
    visionQuote: asNullableString(body.visionQuote, 1000),
    visionPillars: asStringArray(body.visionPillars, 12, 80),
    mission: asNullableString(body.mission, 5000),
    coreValues: asStringArray(body.coreValues, 20, 80),
    valuesHeadline: asNullableString(body.valuesHeadline, 200),
    valuesQuote: asNullableString(body.valuesQuote, 1500),
    coreValueDetails: asDetails(body.coreValueDetails),
    personalRules: asStringArray(body.personalRules, 30, 300),
    rulesHeadline: asNullableString(body.rulesHeadline, 200),
    rulesSubtitle: asNullableString(body.rulesSubtitle, 300),
    ruleDetails: asDetails(body.ruleDetails),
    rulesNonNegotiable: asNullableString(body.rulesNonNegotiable, 2000),
    rulesDailyCommitment: asNullableString(body.rulesDailyCommitment, 2000),
  };

  // When ruleDetails saved, sync personalRules titles for dashboard
  let personalRules = fields.personalRules;
  if (fields.ruleDetails !== undefined) {
    personalRules = fields.ruleDetails.map((d) => d.title).slice(0, 30);
  }

  const data: Prisma.UserUpdateInput = {};
  const map: [keyof typeof fields, unknown][] = [
    ["vision", fields.vision],
    ["visionHeadline", fields.visionHeadline],
    ["visionQuote", fields.visionQuote],
    ["visionPillars", fields.visionPillars],
    ["mission", fields.mission],
    ["coreValues", fields.coreValues],
    ["valuesHeadline", fields.valuesHeadline],
    ["valuesQuote", fields.valuesQuote],
    ["coreValueDetails", fields.coreValueDetails],
    ["personalRules", personalRules],
    ["rulesHeadline", fields.rulesHeadline],
    ["rulesSubtitle", fields.rulesSubtitle],
    ["ruleDetails", fields.ruleDetails],
    ["rulesNonNegotiable", fields.rulesNonNegotiable],
    ["rulesDailyCommitment", fields.rulesDailyCommitment],
  ];

  for (const [key, val] of map) {
    if (val === undefined) continue;
    if (key === "coreValueDetails" || key === "ruleDetails") {
      (data as Record<string, unknown>)[key] = val as Prisma.InputJsonValue;
    } else {
      (data as Record<string, unknown>)[key] = val;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid foundation fields found.", receivedKeys: Object.keys(body) },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });
    return NextResponse.json({ foundation: payload(updated as unknown as Record<string, unknown>) });
  } catch (err) {
    console.error("Foundation save failed:", err);
    return NextResponse.json(
      {
        error:
          "Database could not save. Run prisma db push after adding rulesHeadline, rulesSubtitle, ruleDetails, rulesNonNegotiable, rulesDailyCommitment (and earlier vision/values columns).",
      },
      { status: 500 },
    );
  }
}
