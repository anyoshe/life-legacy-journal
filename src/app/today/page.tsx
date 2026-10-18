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
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageMoodHeader } from "@/components/ui/PageMoodHeader";
import { StatStrip } from "@/components/ui/StatStrip";

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
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="habits">
        <main className="mx-auto max-w-7xl space-y-6 overflow-visible px-4 py-8 pb-28 sm:px-6 lg:px-8">
          <PageMoodHeader
            accent="sage"
            eyebrow={greeting()}
            title={firstName ? `${firstName}, here is today` : "Today"}
            description={new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(now)}
            action={
              <Link
                href="/entry/new"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#14532d] shadow-sm"
              >
                Write a reflection
              </Link>
            }
          />

          <StatStrip
            items={[
              {
                label: "Todos",
                value: `${todosDone}/${todoItems.length}`,
                tone: "sage",
              },
              {
                label: "Habits",
                value: `${habitsDone}/${habitItems.length}`,
                tone: "indigo",
              },
              {
                label: "Actions",
                value: `${actionsDone}/${actionItems.length}`,
                tone: "gold",
              },
            ]}
          />

          {/* Todos full width so Add never clips; habits + actions side by side on lg */}
          <section className="card space-y-3 overflow-visible p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--secondary)]">
                  Day list
                </p>
                <h2 className="text-base font-semibold text-[var(--text)]">Todos</h2>
              </div>
              <span className="badge badge-sage">Today</span>
            </div>
            <TodayTodos items={todoItems} goals={goalOptions} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card space-y-3 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                    Consistency
                  </p>
                  <h2 className="text-base font-semibold text-[var(--text)]">Habits</h2>
                </div>
                <Link href="/habits" className="text-xs font-semibold text-primary hover:underline">
                  Manage →
                </Link>
              </div>
              <TodayHabits items={habitItems} />
            </section>

            <section className="card space-y-3 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--achievement)]">
                    Progress
                  </p>
                  <h2 className="text-base font-semibold text-[var(--text)]">Goal actions</h2>
                </div>
                <Link href="/goals" className="text-xs font-semibold text-primary hover:underline">
                  Goals →
                </Link>
              </div>
              <p className="text-xs text-secondary">Work that moves your vision forward</p>
              <TodayActions items={actionItems} />
            </section>
          </div>
        </main>
      </MoodCanvas>
    </AppShell>
  );
}
