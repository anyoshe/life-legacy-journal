import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  HeartHandshake,
  LockKeyhole,
  Sparkles,
  Target,
} from "lucide-react";

const capabilities = [
  {
    title: "Journal",
    description: "Capture what happened, what you learned, and what you want to remember.",
    status: "Available",
    icon: BookOpen,
  },
  {
    title: "Goals",
    description: "Give meaningful outcomes a life area, a reason, and a next step.",
    status: "Available",
    icon: Target,
  },
  {
    title: "Relationships",
    description: "Invite your partner and choose what you share. Private entries stay private.",
    status: "Available",
    icon: HeartHandshake,
  },
  {
    title: "Personal growth",
    description: "Connect goals to the parts of life you want to tend over time.",
    status: "Available",
    icon: Compass,
  },
  {
    title: "Reviews & memories",
    description: "Build a longer view through reviews, experiences, lessons, and gratitude.",
    status: "Coming soon",
    icon: Sparkles,
  },
  {
    title: "AI-assisted reflection",
    description: "A future reflection companion grounded in your own story and choices.",
    status: "Coming soon",
    icon: Sparkles,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="relative z-10">
        <nav aria-label="Main navigation" className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-primary">
            Life <span className="text-[var(--text)]">&amp; Legacy</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-colors hover:text-primary">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)]">
              Create account
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute -right-40 -top-32 h-[34rem] w-[34rem] rounded-full bg-[var(--private-bg)] opacity-80 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-[var(--shared-goal-bg)] opacity-70 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-surface/80 px-3 py-1.5 text-xs font-medium text-secondary shadow-sm">
              <LockKeyhole size={14} className="text-primary" aria-hidden="true" />
              A private space for the life you are building
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl">
              Make room for
              <span className="block text-primary">the life you mean to live.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-secondary sm:text-lg sm:leading-8">
              Life &amp; Legacy is a private Life Operating System for capturing your story, reflecting on your life, setting goals, nurturing relationships, and growing with intention.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[var(--primary-dark)]"
              >
                Begin your story
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-surface px-6 py-3.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--border-subtle)]"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-5 text-xs text-secondary">
              Your journal is private by default. Sharing is always a choice.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-[var(--private-bg)] via-transparent to-[var(--shared-goal-bg)] opacity-80 blur-xl" />
            <div className="card-elevated relative overflow-hidden p-6 sm:p-7">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-secondary">A steady practice</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text)]">Reflect. Choose. Grow.</h2>
                </div>
                <span className="rounded-2xl bg-private p-3 text-primary">
                  <BookOpen size={22} aria-hidden="true" />
                </span>
              </div>
              <ul className="space-y-4 py-5">
                {[
                  { label: "Capture your days", sub: "A calm place to write honestly.", icon: BookOpen },
                  { label: "Move toward what matters", sub: "Goals shaped around your life.", icon: Target },
                  { label: "Grow together, by choice", sub: "Share only what you choose.", icon: HeartHandshake },
                ].map(({ label, sub, icon: Icon }) => (
                  <li key={label} className="flex items-center gap-3">
                    <span className="rounded-xl bg-background p-2.5 text-primary"><Icon size={18} aria-hidden="true" /></span>
                    <span>
                      <span className="block text-sm font-medium text-[var(--text)]">{label}</span>
                      <span className="mt-0.5 block text-xs text-secondary">{sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-[var(--border)] bg-background/70 p-4">
                <p className="text-sm leading-6 text-secondary">
                  Not a scorecard for your life. A thoughtful place to notice, decide, and keep becoming.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-surface/70">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">A grounded beginning</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
              What is Life &amp; Legacy?
            </h2>
            <p className="mt-4 text-sm leading-7 text-secondary sm:text-base">
              One private place to bring your reflections, goals, growth, and relationships together—without pretending everything is already figured out.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(({ title, description, status, icon: Icon }) => {
              const available = status === "Available";
              return (
                <article key={title} className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow)] sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-xl bg-private p-2.5 text-primary transition-colors group-hover:bg-[var(--primary)] group-hover:text-white">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${available ? "bg-shared-goal text-[var(--success)]" : "bg-background text-secondary"}`}>
                      {status}
                    </span>
                  </div>
                  <h3 className="mt-5 font-semibold text-[var(--text)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-secondary">{description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="overflow-hidden rounded-3xl bg-[var(--primary-dark)] px-6 py-9 text-white sm:px-10 sm:py-12">
          <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">Begin where you are</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">A more intentional life starts with one honest step.</h2>
              <p className="mt-3 text-sm leading-6 text-indigo-100">Write a reflection, name a goal, or simply take a look around.</p>
            </div>
            <Link href="/sign-up" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition-colors hover:bg-indigo-50">
              Create your account
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-secondary sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Life &amp; Legacy — a private place to reflect and grow.</p>
          <p className="inline-flex items-center gap-1.5"><LockKeyhole size={13} aria-hidden="true" /> Private by default</p>
        </div>
      </footer>
    </main>
  );
}
