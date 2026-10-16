import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
import { getWeekContext } from "@/lib/week-review";
import { WeeklyGlance } from "@/components/WeeklyGlance";
import { WeeklyReviewForm } from "./WeeklyReviewForm";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function WeeklyReviewPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const ctx = await getWeekContext(user.id);
  const existing = ctx.existingReview;
  const content =
    existing && existing.content && typeof existing.content === "object"
      ? (existing.content as Record<string, unknown>)
      : {};

  return (
    <div className="page-wash min-h-screen pb-nav">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Reviews
          </Link>
          <span className="text-sm font-medium text-[var(--text)]">Weekly review</span>
          <Link href="/summary/weekly" className="text-sm text-primary">
            Glance only
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div>
          <p className="eyebrow mb-2">This week at a glance</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Weekly summary
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {fmt(ctx.periodStart)} – {fmt(ctx.periodEnd)} · from your data only
            (not AI)
          </p>
        </div>

        <WeeklyGlance data={ctx} />

        <div className="divider-soft" />

        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Your written reflection
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Optional notes after you have seen the numbers.
          </p>
        </div>

        <WeeklyReviewForm
          periodStart={ctx.periodStart.toISOString()}
          periodEnd={ctx.periodEnd.toISOString()}
          initial={{
            wins: String(content.wins ?? ""),
            challenges: String(content.challenges ?? ""),
            lessons: String(content.lessons ?? ""),
            gratitude: String(content.gratitude ?? ""),
            relationships: String(content.relationships ?? ""),
            focusNextWeek: String(content.focusNextWeek ?? ""),
            energy:
              typeof content.energy === "number" ? content.energy : null,
            notes: String(content.notes ?? ""),
          }}
        />
      </main>
    </div>
  );
}
