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
import { RulesCompassCard } from "@/components/dashboard/RulesCompassCard";
import { lifeAreaMood } from "@/lib/nav-config";
import { HideableLifeAreaTiles } from "@/components/dashboard/HideableLifeAreaTiles";

const activeGoalStatuses = new Set<GoalStatus>([
  GoalStatus.ACTIVE,
  GoalStatus.ON_TRACK,
  GoalStatus.NEEDS_ATTENTION,
  GoalStatus.BEHIND,
]);

/** Shown on dashboard area map (everything except archived/abandoned). */
const dashboardGoalStatuses = new Set<GoalStatus>([
  GoalStatus.ACTIVE,
  GoalStatus.ON_TRACK,
  GoalStatus.NEEDS_ATTENTION,
  GoalStatus.BEHIND,
  GoalStatus.COMPLETED,
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
        // Hide finance line-items (individual creditors / savings pots).
        // Those live under /finance. Board shows umbrellas like other goals.
        where: {
          userId: user.id,
          status: { not: GoalStatus.ARCHIVED },
          financePlan: null,
        },
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
  const mapGoals = goals.filter((g) => dashboardGoalStatuses.has(g.status));
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
  const visionHeadline = (user as { visionHeadline?: string | null }).visionHeadline?.trim() || "";
  const visionPillars = (user as { visionPillars?: string[] }).visionPillars ?? [];
  const visionQuote = (user as { visionQuote?: string | null }).visionQuote?.trim() || "";
  const hasVision =
    Boolean(user.vision?.trim()) ||
    Boolean(visionHeadline) ||
    visionPillars.length > 0 ||
    Boolean(visionQuote);
  const hasMission = Boolean(user.mission?.trim());
  const values = user.coreValues ?? [];
  const valuesQuote =
    (user as { valuesQuote?: string | null }).valuesQuote?.trim() || "";
  const rulesHeadline =
    (user as { rulesHeadline?: string | null }).rulesHeadline?.trim() || "";
  const ruleDetails = (
    (user as { ruleDetails?: { title?: string; body?: string }[] | null }).ruleDetails ??
    []
  );
  const ruleTitles =
    ruleDetails.length > 0
      ? ruleDetails.map((d) => (d.title || "").trim()).filter(Boolean)
      : (user.personalRules ?? []);
  const rulesDailyCommitment =
    (user as { rulesDailyCommitment?: string | null }).rulesDailyCommitment?.trim() ||
    "";
  const hasRules =
    ruleTitles.length > 0 ||
    Boolean(rulesHeadline) ||
    Boolean(rulesDailyCommitment);
  const hasValues =
    values.length > 0 ||
    Boolean(valuesQuote) ||
    Boolean((user as { valuesHeadline?: string | null }).valuesHeadline?.trim());
  const rules = ruleTitles;

  const goalsByArea = new Map<GoalArea, typeof mapGoals>();
  for (const g of mapGoals) {
    const list = goalsByArea.get(g.area) ?? [];
    list.push(g);
    goalsByArea.set(g.area, list);
  }

  const lifeAreaTiles = (() => {
    const areasWithGoals = [...goalsByArea.keys()];
    const seen = new Set<GoalArea>();
    const areas: GoalArea[] = [];
    for (const a of [...showcaseAreas, ...areasWithGoals]) {
      if (seen.has(a)) continue;
      seen.add(a);
      areas.push(a);
    }
    return areas.map((area) => {
      const mood = lifeAreaMood[area] ?? lifeAreaMood.OTHER;
      const list = goalsByArea.get(area) ?? [];
      const top = list[0];
      return {
        area,
        label: mood.label,
        gradient: mood.gradient,
        goalCount: list.length,
        topGoalId: top?.id ?? null,
        topGoalTitle: top?.title ?? null,
      };
    });
  })();

  return (
    <div className="page-wash min-h-screen pb-nav">
      <DashboardTopNav rightSlot={<UserButton />} />

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {/* A. Welcome — compact */}
        <header className="flex flex-wrap items-end justify-between gap-4 pb-1">
          <div className="space-y-1">
            <p className="text-sm font-medium text-secondary">
              {getGreeting(now.getHours())}
              {firstName ? `, ${firstName}` : ""}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
              WELCOME TO YOUR &amp; LEGACY JOURNEY
            </h1>
            <p className="text-sm text-muted">
              {new Intl.DateTimeFormat("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(now)}
            </p>
          </div>
          <Link href="/entry/new" className="btn-primary rounded-full px-5 text-sm shadow-sm">
            Write today
          </Link>
        </header>

        {/* A2. Foundation compass — display hierarchy; edit on /foundation */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="eyebrow text-primary/80">YOUR FOUNDATION</p>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">WHAT GUIDES YOUR LIFE</h2>
            </div>
            <Link
              href="/foundation"
              className="text-xs font-medium text-primary hover:underline"
            >
              {hasVision || hasMission || hasValues || hasRules
                ? "View or edit →"
                : "Write foundation →"}
            </Link>
          </div>

          {!(hasVision || hasMission || hasValues || hasRules) ? (
            <Link
              href="/foundation"
              className="card-interactive block rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/80 p-8 text-center shadow-sm"
            >
              <p className="text-sm font-semibold text-[var(--text)]">
                Start with vision, mission, values, and rules
              </p>
              <p className="mt-1 text-xs text-secondary">
                Hierarchy begins here — then goals and daily actions follow.
              </p>
            </Link>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {hasVision && (
                <Link
                  href="/foundation#vision"
                  className="card-interactive block space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-5 shadow-sm transition hover:border-primary/20 hover:shadow-md sm:col-span-2"
                >
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                    Vision
                  </p>
                  {visionHeadline ? (
                    <p className="text-lg font-bold uppercase tracking-wide text-[var(--text)] sm:text-xl">
                      {clip(visionHeadline, 80)}
                    </p>
                  ) : null}
                  {visionPillars.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {visionPillars.slice(0, 5).map((p) => (
                        <span
                          key={p}
                          className="rounded-full bg-[var(--private-bg)] px-3 py-1 text-xs font-semibold text-primary"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  {user.vision?.trim() ? (
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text)]">
                      {clip(user.vision, 160)}
                    </p>
                  ) : null}
                  {visionQuote ? (
                    <p className="line-clamp-2 border-l-2 border-primary/30 pl-2 text-xs italic text-secondary">
                      “{clip(visionQuote, 100)}”
                    </p>
                  ) : null}
                </Link>
              )}
              {hasMission && (
                <Link
                  href="/foundation#mission"
                  className="card-interactive block rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-5 shadow-sm transition hover:border-primary/20 hover:shadow-md"
                >
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--secondary)] italic">
                    Mission
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-snug text-[var(--text)]">
                    {clip(user.mission, 140)}
                  </p>
                </Link>
              )}
              {hasValues && (
                <Link
                  href="/foundation#values"
                  className="card-interactive block space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-5 shadow-sm transition hover:border-primary/20 hover:shadow-md"
                >
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--achievement)]">
                    Values
                  </p>
                  {values.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {values.slice(0, 8).map((v) => (
                        <span
                          key={v}
                          className="rounded-full bg-[var(--private-bg)] px-3 py-1 text-xs font-semibold text-primary"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                  {valuesQuote ? (
                    <p className="line-clamp-3 border-l-2 border-[var(--achievement)]/40 pl-2 text-xs italic leading-snug text-secondary">
                      “{clip(valuesQuote, 160)}”
                    </p>
                  ) : null}
                </Link>
              )}
              {hasRules && (
                <RulesCompassCard
                  rulesHeadline={rulesHeadline || null}
                  ruleTitles={ruleTitles}
                  dailyCommitment={rulesDailyCommitment || null}
                />
              )}
            </div>
          )}
        </section>

        {/* B. Metrics — soft strip */}
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-4 text-center shadow-sm sm:px-4">
            <p className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              {entryCount}
            </p>
            <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-secondary sm:text-xs">
              Reflections
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-4 text-center shadow-sm sm:px-4">
            <p className="text-2xl font-semibold tracking-tight text-[var(--secondary)] sm:text-3xl">
              {habitsDone}/{habitItems.length || 0}
            </p>
            <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-secondary sm:text-xs">
              Habits today
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-4 text-center shadow-sm sm:px-4">
            <p className="text-xl font-semibold text-[var(--text)] sm:text-2xl">
              {activeGoals.length}
            </p>
            <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-secondary sm:text-xs">Active goals</p>
          </div>
        </section>

        {/* C. Goals by life area — hide empty "Begin when ready" tiles */}
        <HideableLifeAreaTiles tiles={lifeAreaTiles} />

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

          <div className="card card-tint-rose space-y-3 p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold text-[var(--text)]">Together</h2>
            <p className="text-sm text-secondary">
              {couple
                ? "You are linked. Share only what you choose — private stays private."
                : relationshipPending
                  ? "An invitation is waiting in Couple."
                  : "Optional partner space. Fully usable on your own."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/couple" className="btn-secondary text-xs">
                Couple
              </Link>
              <Link href="/letters" className="btn-secondary text-xs">
                Letters
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
