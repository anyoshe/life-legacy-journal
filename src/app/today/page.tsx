import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Moon,
  Target,
} from "lucide-react";
import { GoalArea, GoalStatus } from "@prisma/client";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TodayActions,
  type TodayActionItem,
} from "@/components/dashboard/TodayActions";
import {
  TodayHabits,
  type TodayHabitItem,
} from "@/components/dashboard/TodayHabits";

const activeStatuses = new Set<GoalStatus>([
  GoalStatus.ACTIVE,
  GoalStatus.ON_TRACK,
  GoalStatus.NEEDS_ATTENTION,
  GoalStatus.BEHIND,
]);

const areaLabels: Record<GoalArea, string> = {
  SPIRITUAL: "Spiritual",
  MARRIAGE: "Relationship",
  FAMILY: "Family",
  FINANCIAL: "Financial",
  CAREER: "Career",
  BUSINESS: "Business",
  PERSONAL: "Personal",
  HEALTH: "Health",
  SOCIAL: "Social",
  LEARNING: "Learning",
  SERVICE: "Service",
  OTHER: "Other",
};

function todayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export default async function TodayPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const today = todayDateOnly();
  const now = new Date();

  const [habits, goals] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        logs: { where: { date: today }, take: 1 },
      },
    }),
    prisma.goal.findMany({
      where: {
        userId: user.id,
        status: { in: [...activeStatuses] },
      },
      include: {
        actions: {
          where: { completed: false },
          select: { id: true, title: true, completed: true },
          take: 20,
        },
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const habitItems: TodayHabitItem[] = habits.map((h) => ({
    id: h.id,
    title: h.title,
    targetPerWeek: h.targetPerWeek,
    doneToday: h.logs[0]?.completed ?? false,
  }));

  const actionItems: TodayActionItem[] = [];
  for (const goal of goals) {
    for (const action of goal.actions) {
      actionItems.push({
        id: action.id,
        goalId: goal.id,
        goalTitle: goal.title,
        area: areaLabels[goal.area],
        title: action.title,
        doneToday: action.completed,
      });
    }
  }

  const habitsDone = habitItems.filter((h) => h.doneToday).length;
  const actionsDone = actionItems.filter((a) => a.doneToday).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="text-sm font-medium text-[var(--text)]">Today</span>
          <Link href="/reviews/weekly" className="text-sm text-primary">
            Review
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-secondary">
            <CalendarDays size={14} />
            {new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(now)}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            Today&apos;s cockpit
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Check off habits and actions. They feed your goals — and your goals
            serve your mission and vision.
          </p>
          <p className="mt-3 text-xs text-secondary">
            Habits {habitsDone}/{habitItems.length} · Actions {actionsDone}/
            {actionItems.length}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Quick href="/entry/new" icon={<BookOpen size={16} />} label="Journal" />
          <Quick href="/habits" icon={<Target size={16} />} label="Habits" />
          <Quick href="/dreams" icon={<Moon size={16} />} label="Dreams" />
          <Quick
            href="/reviews/weekly"
            icon={<CalendarDays size={16} />}
            label="Weekly review"
          />
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">Habits</h2>
          <TodayHabits items={habitItems} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">
            Open actions
          </h2>
          <TodayActions items={actionItems} />
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-surface p-5">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Remember the chain
          </h2>
          <p className="mt-2 text-xs leading-5 text-secondary">
            Today&apos;s check-offs move goals. Goals serve mission and vision.{" "}
            <Link href="/foundation" className="text-primary">
              Foundation
            </Link>
            {" · "}
            <Link href="/goals" className="text-primary">
              Goals
            </Link>
            {" · "}
            <Link href="/dashboard" className="text-primary">
              Dashboard
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function Quick({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card flex flex-col items-center gap-2 p-3 text-center text-xs font-medium text-[var(--text)] hover:border-primary/30"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </Link>
  );
}
