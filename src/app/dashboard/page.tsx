import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { CoupleStatus, GoalArea, GoalStatus, Visibility } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { getActiveCoupleForUser } from "@/lib/couple-access";
import { prisma } from "@/lib/prisma";
import {
  TodayActions,
  type TodayActionItem,
} from "@/components/dashboard/TodayActions";
import {
  TodayHabits,
  type TodayHabitItem,
} from "@/components/dashboard/TodayHabits";
import { DashboardTopNav } from "@/components/layout/DashboardTopNav";
import { lifeAreaMood } from "@/lib/nav-config";

const activeGoalStatuses = new Set<GoalStatus>([
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

const showcaseAreas: GoalArea[] = [
  GoalArea.SPIRITUAL,
  GoalArea.MARRIAGE,
  GoalArea.FINANCIAL,
  GoalArea.HEALTH,
  GoalArea.PERSONAL,
  GoalArea.CAREER,
];

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function clip(text: string | null | undefined, max: number) {
  if (!text?.trim()) return null;
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max).trim()}…`;
}

export default async function DashboardPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const couple = await getActiveCoupleForUser(user.id);
  const today = todayDateOnly();
  const now = new Date();

  const [entryCount, goals, recentEntries, pendingCouples, habits] =
    await Promise.all([
      prisma.entry.count({ where: { userId: user.id } }),
      prisma.goal.findMany({
        where: { userId: user.id, status: { not: GoalStatus.ARCHIVED } },
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
        include: {
          milestones: { select: { id: true, completed: true } },
          actions: {
            select: { id: true, title: true, completed: true, dueDate: true },
          },
        },
      }),
      prisma.entry.findMany({
        where: {
          OR: [
            { userId: user.id },
            ...(couple
              ? [
                  {
                    userId: { not: user.id },
                    coupleId: couple.id,
                    visibility: Visibility.SHARED_WITH_PARTNER,
                  },
                ]
              : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          userId: true,
          visibility: true,
          title: true,
          content: true,
          createdAt: true,
        },
      }),
      prisma.couple.findMany({
        where: {
          status: CoupleStatus.PENDING,
          OR: [{ partnerAId: user.id }, { partnerBId: user.id }],
        },
        select: { id: true, partnerAId: true, partnerBId: true },
        take: 2,
      }),
      prisma.habit.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: "desc" },
        include: { logs: { where: { date: today }, take: 1 } },
      }),
    ]);

  const activeGoals = goals.filter((g) => activeGoalStatuses.has(g.status));
  const habitItems: TodayHabitItem[] = habits.map((h) => ({
    id: h.id,
    title: h.title,
    targetPerWeek: h.targetPerWeek,
    doneToday: h.logs[0]?.completed ?? false,
  }));

  const actionItems: TodayActionItem[] = [];
  for (const goal of activeGoals) {
    for (const action of goal.actions) {
      if (action.completed) continue;
      actionItems.push({
        id: action.id,
        goalId: goal.id,
        goalTitle: goal.title,
        area: areaLabels[goal.area],
        title: action.title,
        doneToday: false,
      });
    }
  }

  const firstName = user.name?.trim().split(/\s+/)[0] || null;
  const habitsDone = habitItems.filter((h) => h.doneToday).length;
  const relationshipPending = pendingCouples.length > 0;

  const goalsByArea = new Map<GoalArea, typeof activeGoals>();
  for (const g of activeGoals) {
    const list = goalsByArea.get(g.area) ?? [];
    list.push(g);
    goalsByArea.set(g.area, list);
  }

  return (
    <div className="page-wash min-h-screen pb-nav">
      <DashboardTopNav rightSlot={<UserButton />} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* A. Welcome — compact */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-secondary">
              {getGreeting(now.getHours())}
              {firstName ? `, ${firstName}` : ""}
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
              Your life map
            </h1>
            <p className="mt-0.5 text-xs text-muted">
              {new Intl.DateTimeFormat("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(now)}
            </p>
          </div>
          <Link href="/entry/new" className="btn-primary text-sm">
            Write today
          </Link>
        </header>

        {/* B. Three metrics only */}
        <section className="grid grid-cols-3 gap-3">
          <div className="card px-3 py-3 text-center sm:px-4">
            <p className="text-xl font-semibold text-primary sm:text-2xl">
              {entryCount}
            </p>
            <p className="text-[0.65rem] text-secondary sm:text-xs">Reflections</p>
          </div>
          <div className="card px-3 py-3 text-center sm:px-4">
            <p className="text-xl font-semibold text-[var(--secondary)] sm:text-2xl">
              {habitsDone}/{habitItems.length || 0}
            </p>
            <p className="text-[0.65rem] text-secondary sm:text-xs">Habits today</p>
          </div>
          <div className="card px-3 py-3 text-center sm:px-4">
            <p className="text-xl font-semibold text-[var(--text)] sm:text-2xl">
              {activeGoals.length}
            </p>
            <p className="text-[0.65rem] text-secondary sm:text-xs">Active goals</p>
          </div>
        </section>

        {/* C. Visual life-area overview — atmospheric “photography” gradients */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Life areas
            </h2>
            <Link href="/goals" className="text-xs font-medium text-primary">
              All goals
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {showcaseAreas.map((area) => {
              const mood = lifeAreaMood[area] ?? lifeAreaMood.OTHER;
              const list = goalsByArea.get(area) ?? [];
              const top = list[0];
              return (
                <Link
                  key={area}
                  href={top ? `/goals/${top.id}` : "/goals"}
                  className="group relative min-h-[7.5rem] overflow-hidden rounded-2xl shadow-sm transition hover:shadow-md"
                  style={{ background: mood.gradient }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                  <div className="relative flex h-full flex-col justify-end p-3.5 text-white">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/80">
                      {mood.label}
                    </p>
                    {top ? (
                      <>
                        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">
                          {top.title}
                        </p>
                        <p className="mt-1 text-[0.65rem] text-white/75">
                          {list.length} active
                        </p>
                      </>
                    ) : (
                      <p className="mt-0.5 text-sm text-white/85">Begin when ready</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* D. Today's focus — colour-led action strip */}
        <section className="grid gap-4 lg:grid-cols-5">
          <div className="card space-y-3 p-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                Today&apos;s focus
              </h2>
              <Link href="/today" className="text-xs font-medium text-primary">
                Open plan →
              </Link>
            </div>
            {habitItems.length === 0 && actionItems.length === 0 ? (
              <p className="text-sm text-secondary">
                No habits or actions yet.{" "}
                <Link href="/habits" className="text-primary hover:underline">
                  Add a habit
                </Link>
              </p>
            ) : (
              <div className="space-y-4">
                {habitItems.length > 0 && (
                  <TodayHabits items={habitItems.slice(0, 3)} />
                )}
                {actionItems.length > 0 && (
                  <TodayActions items={actionItems.slice(0, 4)} />
                )}
              </div>
            )}
          </div>

          <div className="card space-y-3 p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold text-[var(--text)]">Direction</h2>
            {user.vision?.trim() ? (
              <p className="text-sm leading-relaxed text-secondary">
                {clip(user.vision, 160)}
              </p>
            ) : (
              <p className="text-sm text-secondary">
                Set a short vision to orient every goal.
              </p>
            )}
            <Link href="/foundation" className="text-xs font-medium text-primary">
              Foundation →
            </Link>
            <div className="border-t border-[var(--border)] pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Together
              </h3>
              <p className="mt-1 text-xs text-secondary">
                {couple
                  ? "Linked — share only what you choose."
                  : relationshipPending
                    ? "Invitation pending."
                    : "Optional partner space."}
              </p>
              <Link href="/couple" className="mt-1 inline-block text-xs font-medium text-primary">
                Couple →
              </Link>
            </div>
          </div>
        </section>

        {/* E. Recent journal */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Recent reflections
            </h2>
            <Link href="/entries" className="text-xs font-medium text-primary">
              Journal
            </Link>
          </div>
          {recentEntries.length === 0 ? (
            <div className="card p-5 text-center text-sm text-secondary">
              No entries yet.{" "}
              <Link href="/entry/new" className="font-medium text-primary">
                Write the first
              </Link>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {recentEntries.map((entry) => {
                const mine = entry.userId === user.id;
                const shared =
                  entry.visibility === Visibility.SHARED_WITH_PARTNER;
                return (
                  <li key={entry.id}>
                    <Link
                      href={`/entries/${entry.id}`}
                      className="card-interactive block h-full p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            shared ? "badge badge-rose" : "badge badge-indigo"
                          }
                        >
                          {shared
                            ? mine
                              ? "Shared"
                              : "Partner"
                            : "Private"}
                        </span>
                        <span className="text-[0.65rem] text-muted">
                          {new Intl.DateTimeFormat("en-GB", {
                            day: "numeric",
                            month: "short",
                          }).format(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-[var(--text)]">
                        {entry.title || "Untitled"}
                      </p>
                      {clip(entry.content, 80) && (
                        <p className="mt-1 line-clamp-2 text-xs text-secondary">
                          {clip(entry.content, 80)}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* F. Week + quick */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">This week</p>
            <p className="text-xs text-secondary">
              Glance at progress, then write your review — from your data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/summary/weekly" className="btn-secondary text-xs">
              Week glance
            </Link>
            <Link href="/reviews/weekly" className="btn-secondary text-xs">
              Review
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
