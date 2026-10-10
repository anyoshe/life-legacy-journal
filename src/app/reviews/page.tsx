import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, CalendarRange } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function ReviewsPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    orderBy: { periodStart: "desc" },
    take: 30,
  });

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
          <span className="text-sm font-medium text-[var(--text)]">Reviews</span>
          <Link href="/today" className="text-sm text-primary">
            Today
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Reviews</h1>
          <p className="mt-1 text-sm text-secondary">
            Pause weekly and monthly. Notice what happened. Choose the next step.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/reviews/weekly"
            className="card flex items-start gap-3 p-5 hover:border-primary/30"
          >
            <CalendarDays className="mt-0.5 text-primary" size={20} />
            <div>
              <p className="font-semibold text-[var(--text)]">Weekly review</p>
              <p className="mt-1 text-xs text-secondary">
                Wins, lessons, focus for next week
              </p>
            </div>
          </Link>
          <Link
            href="/reviews/monthly"
            className="card flex items-start gap-3 p-5 hover:border-primary/30"
          >
            <CalendarRange className="mt-0.5 text-primary" size={20} />
            <div>
              <p className="font-semibold text-[var(--text)]">Monthly review</p>
              <p className="mt-1 text-xs text-secondary">
                Bigger picture, growth areas, next month
              </p>
            </div>
          </Link>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
            <p className="text-sm text-secondary">No reviews yet.</p>
            <Link
              href="/reviews/weekly"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Start weekly review <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => {
              const c =
                r.content && typeof r.content === "object"
                  ? (r.content as Record<string, unknown>)
                  : {};
              const focus = String(
                c.focusNextMonth ?? c.focusNextWeek ?? "",
              );
              const wins = typeof c.wins === "string" ? c.wins : "";
              return (
                <li key={r.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {r.type.toLowerCase()}
                    </p>
                    <p className="text-xs text-secondary">
                      {fmt(r.periodStart)} – {fmt(r.periodEnd)}
                    </p>
                  </div>
                  {wins && (
                    <p className="mt-3 line-clamp-2 text-sm text-[var(--text)]">
                      <span className="text-secondary">Wins: </span>
                      {wins}
                    </p>
                  )}
                  {focus && (
                    <p className="mt-1 line-clamp-2 text-sm text-secondary">
                      Next: {focus}
                    </p>
                  )}
                  <Link
                    href={
                      r.type === "MONTHLY"
                        ? "/reviews/monthly"
                        : "/reviews/weekly"
                    }
                    className="mt-3 inline-flex text-xs font-medium text-primary"
                  >
                    Open {r.type === "MONTHLY" ? "monthly" : "weekly"} form
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
