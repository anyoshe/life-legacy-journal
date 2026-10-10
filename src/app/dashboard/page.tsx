import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Compass,
  HeartHandshake,
  LockKeyhole,
  Moon,
  Sparkles,
  Target,
} from "lucide-react";
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

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
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

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2
          id={id}
          className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-secondary">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          {action.label}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-lg px-2 py-2 text-sm font-medium text-primary"
          : "rounded-lg px-2 py-2 text-sm text-secondary transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--text)]"
      }
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const couple = await getActiveCoupleForUser(user.id);
  const today = todayDateOnly();
  const now = new Date();

  const [
    entryCount,
    latestEntry,
    goals,
    recentEntries,
    pendingCouples,
    habits,
    recentDreams,
  ] = await Promise.all([
    prisma.entry.count({ where: { userId: user.id } }),
    prisma.entry.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
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
      take: 5,
      select: {
        id: true,
        userId: true,
        type: true,
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
    prisma.dream.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        kind: true,
        title: true,
        content: true,
        date: true,
      },
    }),
  ]);

  const activeGoals = goals.filter((g) => activeGoalStatuses.has(g.status));
  const completedGoalCount = goals.filter(
    (g) => g.status === GoalStatus.COMPLETED,
  ).length;

  const areaCounts = new Map<GoalArea, number>();
  for (const goal of activeGoals) {
    areaCounts.set(goal.area, (areaCounts.get(goal.area) ?? 0) + 1);
  }

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

  const firstName = user.name?.trim().split(/\s+/)[0] || "Friend";
  const relationshipPending = pendingCouples.length > 0;
  const pendingForMe = pendingCouples.some((p) => p.partnerBId === user.id);

  const vision = user.vision;
  const mission = user.mission;
  const coreValues = user.coreValues ?? [];
  const hasVision = Boolean(vision?.trim());
  const hasMission = Boolean(mission?.trim());

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="shrink-0 text-lg font-semibold tracking-tight text-primary"
          >
            Life <span className="text-[var(--text)]">&amp; Legacy</span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden flex-wrap items-center justify-end gap-0 xl:flex"
          >
            <NavLink href="/dashboard" label="Home" active />
            <NavLink href="/today" label="Today" />
            <NavLink href="/foundation" label="Foundation" />
            <NavLink href="/entries" label="Journal" />
            <NavLink href="/goals" label="Goals" />
            <NavLink href="/habits" label="Habits" />
            <NavLink href="/dreams" label="Dreams" />
            <NavLink href="/reviews" label="Reviews" />
            <NavLink href="/couple" label="Couple" />
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/today"
              className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white xl:hidden"
            >
              Today
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-surface px-6 py-7 shadow-sm sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-[var(--private-bg)] blur-2xl" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs font-medium text-secondary">
                <CalendarDays size={14} aria-hidden="true" />
                {new Intl.DateTimeFormat("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(now)}
              </div>
              <p className="text-sm font-medium text-primary">
                {getGreeting(now.getHours())}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
                {firstName}
                <span className="text-secondary">, your life in progress.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-secondary">
                Check off today. Goals move. Mission and vision stay in view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/today"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
              >
                Today&apos;s cockpit
              </Link>
              <Link
                href="/entry/new"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-background px-5 py-3 text-sm font-semibold text-[var(--text)]"
              >
                <BookOpen size={16} /> Journal
              </Link>
              <Link
                href="/reviews/weekly"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-background px-5 py-3 text-sm font-semibold text-[var(--text)]"
              >
                Weekly review
              </Link>
            </div>
          </div>
        </section>

        {/* Hierarchy */}
        <section className="mt-10">
          <SectionHeading
            eyebrow="How it works"
            title="Vision → Mission → Goals → Today"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/foundation" className="card p-4 hover:border-primary/30">
              <p className="text-xs font-semibold uppercase text-primary">1 · Vision</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">
                {hasVision ? "Defined" : "Not set"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-secondary">
                {clip(vision, 80) || "Who you are becoming"}
              </p>
            </Link>
            <Link href="/foundation" className="card p-4 hover:border-primary/30">
              <p className="text-xs font-semibold uppercase text-primary">2 · Mission</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">
                {hasMission ? "Defined" : "Not set"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-secondary">
                {clip(mission, 80) || "Why you are here"}
              </p>
            </Link>
            <Link href="/goals" className="card p-4 hover:border-primary/30">
              <p className="text-xs font-semibold uppercase text-primary">3 · Goals</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">
                {activeGoals.length} active
              </p>
              <p className="mt-1 text-xs text-secondary">
                {completedGoalCount} completed
              </p>
            </Link>
            <Link href="/today" className="card p-4 hover:border-primary/30">
              <p className="text-xs font-semibold uppercase text-primary">4 · Today</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">
                {habitItems.filter((h) => h.doneToday).length}/{habitItems.length} habits
              </p>
              <p className="mt-1 text-xs text-secondary">
                {actionItems.length} open actions
              </p>
            </Link>
          </div>
        </section>

        {/* Snapshot */}
        <section className="mt-10">
          <SectionHeading title="At a glance" />
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            <Link href="/entries" className="card p-4 hover:border-primary/30">
              <p className="text-xs text-secondary">Journal</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{entryCount}</p>
            </Link>
            <Link href="/goals" className="card p-4 hover:border-primary/30">
              <p className="text-xs text-secondary">Goals</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text)]">
                {activeGoals.length}
              </p>
            </Link>
            <Link href="/habits" className="card p-4 hover:border-primary/30">
              <p className="text-xs text-secondary">Habits</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text)]">
                {habits.length}
              </p>
            </Link>
            <Link href="/dreams" className="card p-4 hover:border-primary/30">
              <p className="text-xs text-secondary">Dreams</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text)]">
                {recentDreams.length}
              </p>
            </Link>
            <Link href="/reviews" className="card p-4 hover:border-primary/30">
              <p className="text-xs text-secondary">Reviews</p>
              <p className="mt-1 text-sm font-semibold text-primary">Open →</p>
            </Link>
          </div>
        </section>

        <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
          <div className="space-y-10">
            {/* TODAY COCKPIT ON DASHBOARD */}
            <section>
              <SectionHeading
                eyebrow="Today"
                title="Check off what matters"
                description="Habits and open actions — same actions as /today."
                action={{ href: "/today", label: "Full cockpit" }}
              />
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">
                    Habits
                  </h3>
                  <TodayHabits items={habitItems} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">
                    Open actions
                  </h3>
                  <TodayActions items={actionItems} />
                </div>
              </div>
            </section>

            <section>
              <SectionHeading
                title="Goals in motion"
                action={{ href: "/goals", label: "All goals" }}
              />
              {activeGoals.length === 0 ? (
                <div className="card p-5 text-sm text-secondary">
                  <Link href="/goals" className="text-primary">
                    Create a goal
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {activeGoals.slice(0, 6).map((goal) => {
                    const progress =
                      goal.targetValue != null && goal.targetValue > 0
                        ? Math.min(
                            100,
                            Math.round(
                              ((goal.currentValue ?? 0) / goal.targetValue) * 100,
                            ),
                          )
                        : null;
                    return (
                      <Link
                        key={goal.id}
                        href={`/goals/${goal.id}`}
                        className="card block p-5 hover:border-primary/30"
                      >
                        <p className="text-xs text-primary">
                          {areaLabels[goal.area]}
                        </p>
                        <h3 className="mt-1 font-semibold text-[var(--text)]">
                          {goal.title}
                        </h3>
                        {progress !== null && (
                          <p className="mt-2 text-xs text-secondary">{progress}%</p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <SectionHeading
                title="Recent journal"
                action={{ href: "/entries", label: "History" }}
              />
              {recentEntries.length === 0 ? (
                <div className="card p-5 text-sm text-secondary">
                  <Link href="/entry/new" className="text-primary">
                    Write first entry
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={
                        entry.userId === user.id
                          ? `/entries/${entry.id}`
                          : "/entries"
                      }
                      className="card block p-5 hover:border-primary/30"
                    >
                      <div className="flex items-center gap-2 text-xs text-secondary">
                        <time dateTime={entry.createdAt.toISOString()}>
                          {formatDate(entry.createdAt)}
                        </time>
                        {entry.visibility === Visibility.PRIVATE ? (
                          <LockKeyhole size={12} />
                        ) : (
                          <HeartHandshake size={12} />
                        )}
                      </div>
                      <h3 className="mt-2 font-semibold text-[var(--text)]">
                        {entry.title?.trim() || "Reflection"}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-secondary">
                        {entry.content}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <section>
              <SectionHeading
                title="Reviews"
                action={{ href: "/reviews/weekly", label: "This week" }}
              />
              <Link
                href="/reviews/weekly"
                className="card flex items-center gap-3 p-4 hover:border-primary/30"
              >
                <CalendarDays className="text-primary" size={20} />
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    Weekly review
                  </p>
                  <p className="text-xs text-secondary">
                    Wins, lessons, focus for next week
                  </p>
                </div>
              </Link>
              <Link
                href="/reviews"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                All reviews <ArrowRight size={12} />
              </Link>
            </section>

            <section>
              <SectionHeading
                title="Dreams"
                action={{ href: "/dreams", label: "All" }}
              />
              {recentDreams.length === 0 ? (
                <div className="card p-4 text-sm text-secondary">
                  <Link href="/dreams" className="text-primary">
                    Record a dream
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentDreams.map((d) => (
                    <li key={d.id} className="card p-4">
                      <p className="text-xs font-medium text-primary">
                        {d.kind === "NIGHT_DREAM" ? "Night" : "Day"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--text)]">
                        {d.title || d.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <SectionHeading title="AI space" description="Placeholders only." />
              <div className="space-y-2">
                <div className="card border-dashed p-4">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Sparkles size={14} /> Patterns
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    From your own records later.
                  </p>
                </div>
                <div className="card border-dashed p-4">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CircleDot size={14} /> Attention
                  </div>
                  <p className="mt-1 text-xs text-secondary">Areas that need care.</p>
                </div>
                <div className="card border-dashed p-4">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 size={14} /> Prompt
                  </div>
                  <p className="mt-1 text-xs text-secondary">Gentle questions.</p>
                </div>
              </div>
            </section>

            <section>
              <SectionHeading title="Quick links" />
              <div className="grid grid-cols-2 gap-2">
                <Link href="/foundation" className="card p-3 text-center text-xs font-medium hover:border-primary/30">
                  <Compass className="mx-auto mb-1 text-primary" size={16} />
                  Foundation
                </Link>
                <Link href="/couple" className="card p-3 text-center text-xs font-medium hover:border-primary/30">
                  <HeartHandshake className="mx-auto mb-1 text-primary" size={16} />
                  Couple
                </Link>
                <Link href="/habits" className="card p-3 text-center text-xs font-medium hover:border-primary/30">
                  <Target className="mx-auto mb-1 text-primary" size={16} />
                  Habits
                </Link>
                <Link href="/dreams" className="card p-3 text-center text-xs font-medium hover:border-primary/30">
                  <Moon className="mx-auto mb-1 text-primary" size={16} />
                  Dreams
                </Link>
              </div>
            </section>

            {(couple || relationshipPending) && (
              <div className="card p-4 text-sm">
                <p className="font-medium text-[var(--text)]">
                  {couple
                    ? "Partner connected"
                    : pendingForMe
                      ? "Invitation waiting"
                      : "Invitation pending"}
                </p>
                <Link href="/couple" className="mt-2 text-primary">
                  Couple settings
                </Link>
              </div>
            )}

            {coreValues.length > 0 && (
              <div className="card p-4">
                <p className="text-xs font-semibold uppercase text-primary">
                  Core values
                </p>
                <p className="mt-2 text-sm text-secondary">
                  {coreValues.join(" · ")}
                </p>
              </div>
            )}

            {latestEntry && (
              <p className="text-xs text-secondary">
                Last journal: {formatDate(latestEntry.createdAt)}
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
