import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Compass,
  HeartHandshake,
  LockKeyhole,
  Sparkles,
  Target,
} from "lucide-react";
import { CoupleStatus, GoalArea, GoalStatus, Visibility } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { getActiveCoupleForUser } from "@/lib/couple-access";
import { prisma } from "@/lib/prisma";

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

const featureGroups = [
  {
    title: "Available",
    description: "Useful today, with a deliberately focused scope.",
    features: [
      { name: "Daily journal", detail: "Private by default, with explicit sharing.", href: "/entry/new", icon: BookOpen },
      { name: "Basic goals", detail: "Create goals by life area and track completion.", href: "/goals", icon: Target },
      { name: "Partner linking", detail: "Invite an existing account and accept invitations.", href: "/couple", icon: HeartHandshake },
    ],
  },
  {
    title: "In progress",
    description: "The foundation exists; the full experience is still taking shape.",
    features: [
      { name: "Journal history", detail: "Recent reflections appear here; a dedicated history and editing view is not available yet.", href: null, icon: Clock3 },
      { name: "Goal planning", detail: "Basic goals work; milestone planning and a dedicated goal detail view are not available yet.", href: null, icon: CircleDot },
    ],
  },
  {
    title: "Coming soon",
    description: "Planned product areas, not currently available as user features.",
    features: [
      { name: "Habits & routines", detail: "Daily habit tracking and streaks.", href: null, icon: CheckCircle2 },
      { name: "Reviews & reflection", detail: "Weekly, monthly, and annual review tools.", href: null, icon: CalendarDays },
      { name: "AI-assisted reflection", detail: "Thoughtful coaching grounded in your own entries.", href: null, icon: Sparkles },
      { name: "Life memories", detail: "Experiences, lessons, gratitude, letters, and media.", href: null, icon: Compass },
    ],
  },
];

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
        <h2 id={id} className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-[var(--primary-dark)]"
        >
          {action.label}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const couple = await getActiveCoupleForUser(user.id);
  const [entryCount, latestEntry, goals, recentEntries, pendingCouples] = await Promise.all([
    prisma.entry.count({ where: { userId: user.id } }),
    prisma.entry.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.goal.findMany({
      where: { userId: user.id, status: { not: GoalStatus.ARCHIVED } },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    }),
    prisma.entry.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(couple
            ? [{
                userId: { not: user.id },
                coupleId: couple.id,
                visibility: Visibility.SHARED_WITH_PARTNER,
              }]
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
  ]);

  const activeGoals = goals.filter((goal) => activeGoalStatuses.has(goal.status));
  const completedGoalCount = goals.filter((goal) => goal.status === GoalStatus.COMPLETED).length;
  const areaCounts = new Map<GoalArea, number>();
  for (const goal of activeGoals) {
    areaCounts.set(goal.area, (areaCounts.get(goal.area) ?? 0) + 1);
  }

  const firstName = user.name?.trim().split(/\s+/)[0] || "Friend";
  const now = new Date();
  const relationshipPending = pendingCouples.length > 0;
  const pendingForMe = pendingCouples.some((pending) => pending.partnerBId === user.id);

  const nextActions = [
    ...(entryCount === 0
      ? [{ href: "/entry/new", title: "Write your first reflection", detail: "Give today a place in your story.", icon: BookOpen }]
      : []),
    ...(activeGoals.length === 0
      ? [{ href: "/goals", title: "Create a meaningful goal", detail: "Turn one intention into a next step.", icon: Target }]
      : []),
    ...(!couple && !relationshipPending
      ? [{ href: "/couple", title: "Build your shared space", detail: "Invite your partner when you are ready.", icon: HeartHandshake }]
      : []),
  ];
  if (nextActions.length === 0) {
    nextActions.push({
      href: "/entry/new",
      title: "Make space to reflect",
      detail: "Capture what matters to you today.",
      icon: BookOpen,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-primary">
            Life <span className="text-[var(--text)]">&amp; Legacy</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 sm:flex">
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-primary" href="/dashboard" aria-current="page">Home</Link>
            <Link className="rounded-lg px-3 py-2 text-sm text-secondary transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--text)]" href="/entry/new">Journal</Link>
            <Link className="rounded-lg px-3 py-2 text-sm text-secondary transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--text)]" href="/goals">Goals</Link>
            <Link className="rounded-lg px-3 py-2 text-sm text-secondary transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--text)]" href="/couple">Couple</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-secondary md:inline">{user.email}</span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-surface px-6 py-7 shadow-sm sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-[var(--private-bg)] blur-2xl" />
          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs font-medium text-secondary">
                <CalendarDays size={14} aria-hidden="true" />
                {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now)}
              </div>
              <p className="text-sm font-medium text-primary">{getGreeting(now.getHours())}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
                {firstName}
                <span className="text-secondary">, your life in progress.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-secondary sm:text-base">
                Your life is built one day at a time. Reflect, act, and grow at your own pace.
              </p>
            </div>
            <Link
              href="/entry/new"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)]"
            >
              <BookOpen size={17} aria-hidden="true" />
              Write today
            </Link>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="snapshot-heading">
          <SectionHeading
            id="snapshot-heading"
            eyebrow="Your Life OS"
            title="Your life at a glance"
            description="A clear view of what is here today, without invented scores."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="card flex min-h-36 flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-secondary">Journal</p>
                <span className="rounded-xl bg-private p-2 text-primary"><BookOpen size={18} aria-hidden="true" /></span>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-[var(--text)]">{entryCount}</p>
                <p className="mt-1 text-xs text-secondary">
                  {entryCount === 0
                    ? "No entries yet"
                    : `${entryCount === 1 ? "entry" : "entries"} · ${latestEntry ? `last ${formatDate(latestEntry.createdAt)}` : "saved"}`}
                </p>
              </div>
            </article>
            <article className="card flex min-h-36 flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-secondary">Goals</p>
                <span className="rounded-xl bg-shared-goal p-2 text-[var(--success)]"><Target size={18} aria-hidden="true" /></span>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-[var(--text)]">{activeGoals.length}</p>
                <p className="mt-1 text-xs text-secondary">
                  {completedGoalCount} completed · {activeGoals.length} active
                </p>
              </div>
            </article>
            <article className="card flex min-h-36 flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-secondary">Relationship</p>
                <span className="rounded-xl bg-shared p-2 text-[var(--area-marriage)]"><HeartHandshake size={18} aria-hidden="true" /></span>
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-[var(--text)]">
                  {couple ? "Connected" : relationshipPending ? "Invitation pending" : "Not connected"}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {couple ? "Private entries remain private." : pendingForMe ? "Review the invitation when you are ready." : "Linking is optional."}
                </p>
              </div>
            </article>
            <article className="card flex min-h-36 flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-secondary">Habits &amp; reviews</p>
                <span className="rounded-xl bg-background p-2 text-secondary"><CalendarDays size={18} aria-hidden="true" /></span>
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-[var(--text)]">Coming soon</p>
                <p className="mt-1 text-xs text-secondary">No trackers or review pages are available yet.</p>
              </div>
            </article>
          </div>
        </section>

        <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
          <div className="space-y-10">
            <section aria-labelledby="growth-heading">
              <SectionHeading
                id="growth-heading"
                eyebrow="Personal growth"
                title="Your growth areas"
                description="Active goals by life area. Empty areas are invitations, not scores."
                action={{ href: "/goals", label: "Review goals" }}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(GoalArea).map((area) => {
                  const count = areaCounts.get(area) ?? 0;
                  return (
                    <Link
                      key={area}
                      href="/goals"
                      className="card group flex min-h-28 items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow)]"
                    >
                      <div>
                        <h3 className="font-medium text-[var(--text)]">{areaLabels[area]}</h3>
                        <p className="mt-1 text-xs text-secondary">
                          {count === 0 ? "No active goals yet" : `${count} active ${count === 1 ? "goal" : "goals"}`}
                        </p>
                      </div>
                      <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-background px-2 text-sm font-semibold text-primary transition-colors group-hover:bg-private">
                        {count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="journal-heading">
              <SectionHeading
                id="journal-heading"
                eyebrow="Your story"
                title="Recent reflections"
                description="Only your entries and entries explicitly shared with your active partner appear here."
                action={{ href: "/entry/new", label: "New entry" }}
              />
              {recentEntries.length === 0 ? (
                <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                  <div className="max-w-lg">
                    <h3 className="text-lg font-semibold text-[var(--text)]">Your story starts here.</h3>
                    <p className="mt-2 text-sm leading-6 text-secondary">
                      Capture what happened, what you learned, what you are feeling, and what you want to remember.
                    </p>
                  </div>
                  <Link href="/entry/new" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]">
                    Write your first entry
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEntries.map((entry) => {
                    const fromPartner = entry.userId !== user.id;
                    return (
                      <article key={entry.id} className="card p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-secondary">
                            <time dateTime={entry.createdAt.toISOString()}>{formatDate(entry.createdAt)}</time>
                            <span aria-hidden="true">·</span>
                            <span>{entry.type.replaceAll("_", " ").toLowerCase()}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${fromPartner || entry.visibility === Visibility.SHARED_WITH_PARTNER ? "bg-shared text-[var(--area-marriage)]" : "bg-private text-primary"}`}>
                            {fromPartner ? <HeartHandshake size={13} aria-hidden="true" /> : entry.visibility === Visibility.PRIVATE ? <LockKeyhole size={13} aria-hidden="true" /> : <HeartHandshake size={13} aria-hidden="true" />}
                            {fromPartner ? "Shared with you" : entry.visibility === Visibility.PRIVATE ? "Private" : "Shared with partner"}
                          </span>
                        </div>
                        <h3 className="mt-3 font-semibold text-[var(--text)]">
                          {entry.title?.trim() || "Daily reflection"}
                        </h3>
                        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-secondary">
                          {entry.content}
                        </p>
                      </article>
                    );
                  })}
                  <p className="px-1 text-xs text-secondary">
                    A full journal history and entry editing view are in development.
                  </p>
                </div>
              )}
            </section>

            <section aria-labelledby="goals-heading">
              <SectionHeading
                id="goals-heading"
                eyebrow="Intentional action"
                title="Goals in motion"
                description="Your own current goals and their real status."
                action={{ href: "/goals", label: "All goals" }}
              />
              {activeGoals.length === 0 ? (
                <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">Turn intentions into goals.</h3>
                    <p className="mt-1 text-sm text-secondary">Start with one outcome that matters to you.</p>
                  </div>
                  <Link href="/goals" className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-private">
                    Create your first goal
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {activeGoals.slice(0, 4).map((goal) => {
                    const hasNumericProgress = goal.targetValue !== null && goal.targetValue > 0;
                    const progress = hasNumericProgress
                      ? Math.min(100, Math.round(((goal.currentValue ?? 0) / goal.targetValue!) * 100))
                      : null;
                    return (
                      <article key={goal.id} className="card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium text-primary">{areaLabels[goal.area]}</p>
                            <h3 className="mt-1 font-semibold leading-snug text-[var(--text)]">{goal.title}</h3>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${goal.status === GoalStatus.NEEDS_ATTENTION || goal.status === GoalStatus.BEHIND ? "bg-[var(--achievement-bg)] text-[var(--warning)]" : "bg-shared-goal text-[var(--success)]"}`}>
                            {goal.status.replaceAll("_", " ").toLowerCase()}
                          </span>
                        </div>
                        {progress !== null && (
                          <div className="mt-4">
                            <div className="mb-1.5 flex justify-between text-xs text-secondary">
                              <span>{goal.currentValue ?? 0} / {goal.targetValue} {goal.unit || ""}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="progress-track" role="progressbar" aria-label={`${goal.title} progress`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                              <div className="progress-fill bg-[var(--growth)]" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )}
                        {goal.deadline && (
                          <p className="mt-3 text-xs text-secondary">Due {formatDate(goal.deadline)}</p>
                        )}
                        <Link href="/goals" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                          View in goals
                          <ArrowRight size={13} aria-hidden="true" />
                        </Link>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-10">
            <section aria-labelledby="next-heading">
              <SectionHeading
                id="next-heading"
                eyebrow="A gentle next step"
                title="What’s next?"
                description="A few useful actions based on what you have set up."
              />
              <div className="space-y-3">
                {nextActions.map(({ href, title, detail, icon: Icon }) => (
                  <Link
                    key={title}
                    href={href}
                    className="card group flex items-start gap-3 p-4 transition-all hover:border-primary/30 hover:shadow-[var(--shadow)]"
                  >
                    <span className="rounded-xl bg-private p-2.5 text-primary">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-[var(--text)]">{title}</span>
                      <span className="mt-1 block text-xs leading-5 text-secondary">{detail}</span>
                    </span>
                    <ArrowRight size={16} className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  </Link>
                ))}
              </div>
              {relationshipPending && (
                <div className="mt-4 rounded-xl border border-[var(--border)] bg-surface p-4">
                  <p className="text-sm font-medium text-[var(--text)]">
                    {pendingForMe ? "A partner invitation is waiting for you." : "Your partner invitation is pending."}
                  </p>
                  <Link href="/couple" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Review on Couple
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              )}
              {couple && (
                <div className="mt-4 rounded-xl border border-[var(--border)] bg-surface p-4">
                  <p className="text-sm font-medium text-[var(--text)]">Your partner space is connected.</p>
                  <p className="mt-1 text-xs leading-5 text-secondary">Private entries remain yours unless you explicitly share them.</p>
                  <Link href="/couple" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Manage your connection
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </section>

            <section aria-labelledby="quick-heading">
              <SectionHeading id="quick-heading" eyebrow="Quick access" title="Make a little progress" />
              <div className="grid grid-cols-2 gap-3">
                <Link href="/entry/new" className="card group p-4 transition-colors hover:border-primary/30">
                  <BookOpen size={19} className="text-primary" aria-hidden="true" />
                  <span className="mt-3 block text-sm font-semibold text-[var(--text)]">New entry</span>
                  <span className="mt-1 block text-xs text-secondary">Reflect on today</span>
                </Link>
                <Link href="/goals" className="card group p-4 transition-colors hover:border-primary/30">
                  <Target size={19} className="text-primary" aria-hidden="true" />
                  <span className="mt-3 block text-sm font-semibold text-[var(--text)]">Goals</span>
                  <span className="mt-1 block text-xs text-secondary">Create or review</span>
                </Link>
                <Link href="/couple" className="card group col-span-2 flex items-center gap-3 p-4 transition-colors hover:border-primary/30">
                  <HeartHandshake size={19} className="text-[var(--area-marriage)]" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--text)]">Couple space</span>
                    <span className="mt-1 block text-xs text-secondary">Invite or respond to your partner</span>
                  </span>
                  <ArrowRight size={16} className="ml-auto text-muted" aria-hidden="true" />
                </Link>
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-12 border-t border-[var(--border)] pt-9" aria-labelledby="roadmap-heading">
          <SectionHeading
            id="roadmap-heading"
            eyebrow="A growing companion"
            title="Explore Life & Legacy"
            description="A plain view of what works today and what is still being built."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {featureGroups.map((group) => (
              <section key={group.title} className="rounded-2xl border border-[var(--border)] bg-surface p-5">
                <div className="mb-4">
                  <h3 className="font-semibold text-[var(--text)]">{group.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-secondary">{group.description}</p>
                </div>
                <ul className="space-y-3">
                  {group.features.map(({ name, detail, href, icon: Icon }) => (
                    <li key={name} className="flex gap-3 border-t border-[var(--border-subtle)] pt-3">
                      <span className="mt-0.5 rounded-lg bg-background p-2 text-primary">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        {href ? (
                          <Link href={href} className="text-sm font-medium text-[var(--text)] hover:text-primary">
                            {name}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-[var(--text)]">{name}</p>
                        )}
                        <p className="mt-1 text-xs leading-5 text-secondary">{detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
