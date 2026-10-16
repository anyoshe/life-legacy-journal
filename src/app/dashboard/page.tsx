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
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";

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

/** Areas highlighted on dashboard when user has goals (or as gentle empty invites) */
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
            select: {
              id: true,
              title: true,
              completed: true,
              dueDate: true,
            },
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
        take: 4,
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
        include: {
          logs: { where: { date: today }, take: 1 },
        },
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
  const hasVision = Boolean(user.vision?.trim());
  const hasMission = Boolean(user.mission?.trim());
  const relationshipPending = pendingCouples.length > 0;

  const goalsByArea = new Map<GoalArea, typeof activeGoals>();
  for (const g of activeGoals) {
    const list = goalsByArea.get(g.area) ?? [];
    list.push(g);
    goalsByArea.set(g.area, list);
  }

  return (
    <AppShell rightSlot={<UserButton />}>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* A. Welcome */}
        <header className="max-w-2xl space-y-2">
          <p className="text-sm font-medium text-secondary">
            {getGreeting(now.getHours())}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
            Plan the life you want to live — and leave.
          </h1>
          <p className="text-sm leading-relaxed text-secondary">
            Reflect, act daily, and grow in the areas that matter most to you.
          </p>
        </header>

        {/* B. Daily focus — one primary CTA */}
        <section className="card overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--surface-tint)] px-5 py-4 sm:px-6">
            <p className="eyebrow">Daily focus</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
              Continue your day
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {habitItems.length || actionItems.length
                ? `${habitsDone} of ${habitItems.length} habits · ${actionItems.length} open goal actions`
                : "Start with a reflection or open today’s plan."}
            </p>
          </div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Link href="/entry/new" className="btn-primary justify-center sm:justify-start">
              Write today&apos;s reflection
            </Link>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link href="/today" className="font-medium text-primary hover:underline">
                Today&apos;s plan
              </Link>
              <Link href="/habits" className="text-secondary hover:text-primary">
                Habits
              </Link>
              <Link href="/goals" className="text-secondary hover:text-primary">
                Goals
              </Link>
            </div>
          </div>
        </section>

        {/* C. Life-area overview — real goals only; empty = invitation */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--text)]">
              Life areas
            </h2>
            <Link href="/goals" className="text-sm font-medium text-primary">
              All goals
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {showcaseAreas.map((area) => {
              const list = goalsByArea.get(area) ?? [];
              const top = list[0];
              const openActions = top
                ? top.actions.filter((a) => !a.completed).length
                : 0;
              return (
                <Link
                  key={area}
                  href={top ? `/goals/${top.id}` : "/goals"}
                  className="card-interactive block p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    {areaLabels[area]}
                  </p>
                  {top ? (
                    <>
                      <p className="mt-1.5 font-medium text-[var(--text)]">
                        {top.title}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {list.length} active
                        {openActions > 0 ? ` · ${openActions} next actions` : ""}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1.5 text-sm text-secondary">
                      No goals yet — begin when ready
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* D. Meaningful progress — max 3 */}
        <section className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-primary">{entryCount}</p>
            <p className="text-xs text-secondary">Reflections</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-[var(--secondary)]">
              {habitsDone}/{habitItems.length || 0}
            </p>
            <p className="text-xs text-secondary">Habits today</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-[var(--text)]">
              {activeGoals.length}
            </p>
            <p className="text-xs text-secondary">Active goals</p>
          </div>
        </section>

        {/* Vision strip */}
        <section className="card card-tint-indigo p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Foundation</p>
              <h2 className="mt-1 text-base font-semibold text-[var(--text)]">
                Vision &amp; mission
              </h2>
            </div>
            <Link href="/foundation" className="text-sm font-medium text-primary">
              {hasVision || hasMission ? "Edit" : "Begin"}
            </Link>
          </div>
          {hasVision || hasMission ? (
            <div className="mt-3 space-y-2 text-sm leading-relaxed">
              {hasVision && (
                <p>
                  <span className="font-medium text-primary">Vision · </span>
                  {clip(user.vision, 180)}
                </p>
              )}
              {hasMission && (
                <p className="text-secondary">
                  <span className="font-medium">Mission · </span>
                  {clip(user.mission, 140)}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-secondary">
              A short vision anchors goals and habits. Optional — never blocking.
            </p>
          )}
        </section>

        {/* Today rhythm compact */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text)]">
              Today&apos;s rhythm
            </h2>
            <Link href="/today" className="text-sm font-medium text-primary">
              Open Today →
            </Link>
          </div>
          {habitItems.length === 0 && actionItems.length === 0 ? (
            <EmptyState
              emoji="🌱"
              title="Nothing scheduled yet"
              description="Add a habit or goal action when you are ready."
              actionHref="/habits"
              actionLabel="Add a habit"
            />
          ) : (
            <div className="space-y-5">
              {habitItems.length > 0 && (
                <TodayHabits items={habitItems.slice(0, 4)} />
              )}
              {actionItems.length > 0 && (
                <TodayActions items={actionItems.slice(0, 5)} />
              )}
            </div>
          )}
        </section>

        {/* E. Recent journal */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text)]">
              Recent reflections
            </h2>
            <Link href="/entries" className="text-sm font-medium text-primary">
              Journal
            </Link>
          </div>
          {recentEntries.length === 0 ? (
            <div className="card">
              <EmptyState
                emoji="📖"
                title="Write your first reflection"
                description="A few honest lines become the story of your life."
                actionHref="/entry/new"
                actionLabel="Write an entry"
              />
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            shared ? "badge badge-rose" : "badge badge-indigo"
                          }
                        >
                          {shared
                            ? mine
                              ? "Shared"
                              : "From partner"
                            : "Private"}
                        </span>
                        <span className="text-xs text-muted">
                          {new Intl.DateTimeFormat("en-GB", {
                            day: "numeric",
                            month: "short",
                          }).format(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-[var(--text)]">
                        {entry.title || "Untitled entry"}
                      </p>
                      {clip(entry.content, 100) && (
                        <p className="mt-1 line-clamp-2 text-sm text-secondary">
                          {clip(entry.content, 100)}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* F. Reflection + relationship */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card card-tint-sage p-5">
            <p className="eyebrow">Reflection</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--text)]">
              This week
            </h2>
            <p className="mt-2 text-sm text-secondary">
              See completed and pending work, then write your review — from your
              data, not AI.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/summary/weekly" className="btn-secondary text-sm">
                Week glance
              </Link>
              <Link href="/reviews/weekly" className="btn-secondary text-sm">
                Weekly review
              </Link>
            </div>
          </section>

          <section className="card card-tint-rose p-5">
            <p className="eyebrow">Together</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--text)]">
              Marriage space
            </h2>
            <p className="mt-2 text-sm text-secondary">
              {couple
                ? "You are linked. Share only what you choose — private stays private."
                : relationshipPending
                  ? "An invitation is waiting in Couple."
                  : "Optional partner sharing. Fully usable on your own."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/couple" className="btn-secondary text-sm">
                Couple
              </Link>
              <Link href="/letters" className="btn-secondary text-sm">
                Letters
              </Link>
            </div>
          </section>
        </div>

        {/* G. Quick actions */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/entry/new" className="btn-secondary text-sm">
              New entry
            </Link>
            <Link href="/experiences" className="btn-secondary text-sm">
              Record experience
            </Link>
            <Link href="/goals" className="btn-secondary text-sm">
              Review goals
            </Link>
            <Link href="/export" className="btn-secondary text-sm">
              Export data
            </Link>
          </div>
        </section>

        <p className="pb-4 text-center text-xs text-muted">
          Private by default · Yours for life
        </p>
      </main>
    </AppShell>
  );
}
