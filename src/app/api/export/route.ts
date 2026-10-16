import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format") || "json";

  const [
    foundation,
    entries,
    goals,
    habits,
    lessons,
    letters,
    experiences,
    reviews,
    dreams,
    todos,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        vision: true,
        mission: true,
        coreValues: true,
        personalRules: true,
        email: true,
        name: true,
      },
    }),
    prisma.entry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.goal.findMany({
      where: { userId: user.id },
      include: { milestones: true, actions: true },
    }),
    prisma.habit.findMany({ where: { userId: user.id }, include: { logs: true } }),
    prisma.lesson.findMany({ where: { userId: user.id }, orderBy: { number: "asc" } }),
    prisma.letter.findMany({ where: { userId: user.id } }),
    prisma.experience.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    prisma.review.findMany({ where: { userId: user.id }, orderBy: { periodStart: "desc" } }),
    prisma.dream.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    prisma.todo.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 500 }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    foundation,
    entries,
    goals,
    habits,
    lessons,
    letters,
    experiences,
    reviews,
    dreams,
    todos,
  };

  if (format === "markdown") {
    const md = toMarkdown(payload);
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="life-legacy-export.md"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="life-legacy-export.json"`,
    },
  });
}

function toMarkdown(data: {
  exportedAt: string;
  foundation: {
    name: string | null;
    vision: string | null;
    mission: string | null;
    coreValues: string[];
    personalRules: string[];
  } | null;
  entries: Array<{ title: string | null; content: string; createdAt: Date; type: string }>;
  goals: Array<{ title: string; area: string; status: string; why: string | null }>;
  lessons: Array<{ number: number; title: string; content: string }>;
  experiences: Array<{ title: string; whatHappened: string; date: Date }>;
  letters: Array<{ recipient: string; title: string | null; content: string }>;
}): string {
  const lines: string[] = [];
  lines.push(`# Life & Legacy export`);
  lines.push(`Exported: ${data.exportedAt}`);
  lines.push("");
  if (data.foundation) {
    lines.push(`## Foundation`);
    lines.push(`**Vision:** ${data.foundation.vision || "—"}`);
    lines.push("");
    lines.push(`**Mission:** ${data.foundation.mission || "—"}`);
    lines.push("");
    lines.push(`**Values:** ${(data.foundation.coreValues || []).join(", ") || "—"}`);
    lines.push("");
  }
  lines.push(`## Goals`);
  for (const g of data.goals) {
    lines.push(`- **${g.title}** (${g.area}, ${g.status})${g.why ? ` — ${g.why}` : ""}`);
  }
  lines.push("");
  lines.push(`## Lessons`);
  for (const l of data.lessons) {
    lines.push(`### Lesson #${String(l.number).padStart(3, "0")}: ${l.title}`);
    lines.push(l.content);
    lines.push("");
  }
  lines.push(`## Experiences`);
  for (const e of data.experiences) {
    lines.push(`### ${e.title} (${new Date(e.date).toISOString().slice(0, 10)})`);
    lines.push(e.whatHappened);
    lines.push("");
  }
  lines.push(`## Letters`);
  for (const letter of data.letters) {
    lines.push(`### To ${letter.recipient}: ${letter.title || "Untitled"}`);
    lines.push(letter.content);
    lines.push("");
  }
  lines.push(`## Recent journal entries`);
  for (const entry of data.entries.slice(0, 100)) {
    lines.push(
      `### ${entry.title || entry.type} — ${new Date(entry.createdAt).toISOString().slice(0, 10)}`,
    );
    lines.push(entry.content);
    lines.push("");
  }
  return lines.join("\n");
}
