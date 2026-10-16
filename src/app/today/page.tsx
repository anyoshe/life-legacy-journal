import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
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
import {
  TodayTodos,
  type TodayTodoItem,
} from "@/components/dashboard/TodayTodos";
import { LifeHero } from "@/components/ui/LifeHero";
import { QuickActions } from "@/components/ui/QuickActions";
import { FabAdd } from "@/components/ui/FabAdd";
import { AppShellHeader } from "@/components/AppNav";

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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const today = todayDateOnly();
  const now = new Date();

  const [habits, goals, todos] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
      include: { logs: { where: { date: today }, take: 1 } },
    }),
    prisma.goal.findMany({
      where: { userId: user.id, status: { in: [...activeStatuses] } },
      include: {
        actions: {
          where: { completed: false },
          select: {
            id: true,
            title: true,
            completed: true,
            timeOfDay: true,
          },
          take: 30,
        },
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    }),
    prisma.todo.findMany({
      where: { userId: user.id, date: today },
      orderBy: [{ completed: "asc" }, { timeOfDay: "asc" }, { createdAt: "asc" }],
      include: { goal: { select: { id: true, title: true, area: true } } },
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
        title: action.timeOfDay
          ? `${action.timeOfDay} · ${action.title}`
          : action.title,
        doneToday: action.completed,
      });
    }
  }

  const todoItems: TodayTodoItem[] = todos.map((t) => ({
    id: t.id,
    title: t.title,
    timeOfDay: t.timeOfDay,
    completed: t.completed,
    goalId: t.goalId,
    goal: t.goal,
  }));

  const goalOptions = goals.map((g) => ({ id: g.id, title: g.title }));
  const habitsDone = habitItems.filter((h) => h.doneToday).length;
  const actionsDone = actionItems.filter((a) => a.doneToday).length;
  const todosDone = todoItems.filter((t) => t.completed).length;
  const firstName = user.name?.split(" ")[0] ?? null;

  return (
    <div className="page-wash min-h-screen pb-nav">
      <AppShellHeader rightSlot={<UserButton />} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <LifeHero
          greeting={greeting()}
          name={firstName ? `${firstName}, here is today` : "Here is today"}
          subtitle={new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(now)}
          variant="indigo"
        >
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">
              Todos {todosDone}/{todoItems.length}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">
              Habits {habitsDone}/{habitItems.length}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">
              Actions {actionsDone}/{actionItems.length}
            </span>
          </div>
        </LifeHero>

        <QuickActions compact />

        <section className="card card-tint-sage space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text)]">Day list</h2>
            <span className="badge badge-sage">Timed</span>
          </div>
          <TodayTodos items={todoItems} goals={goalOptions} />
        </section>

        <section className="card card-tint-indigo space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text)]">Habits</h2>
            <Link href="/habits" className="text-xs font-medium text-primary">
              Manage
            </Link>
          </div>
          <TodayHabits items={habitItems} />
        </section>

        <section className="card card-tint-gold space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text)]">
              Goal actions
            </h2>
            <Link href="/goals" className="text-xs font-medium text-primary">
              Goals
            </Link>
          </div>
          <p className="text-xs text-secondary">
            Work that moves your vision forward
          </p>
          <TodayActions items={actionItems} />
        </section>
      </main>

      <FabAdd href="/entry/new" />
    </div>
  );
}
