import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
import { getMonthContext } from "@/lib/month-review";
import { MonthlyReviewForm } from "./MonthlyReviewForm";
import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function MonthlyReviewPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const ctx = await getMonthContext(user.id);
  const existing = ctx.existingReview;
  const content =
    existing && existing.content && typeof existing.content === "object"
      ? (existing.content as Record<string, unknown>)
      : {};

  return (
    <AppShell rightSlot={<UserButton />}>
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Reviews
          </Link>
          <span className="text-sm font-medium text-[var(--text)]">
            Monthly review
          </span>
          <Link href="/reviews/weekly" className="text-sm text-primary">
            Weekly
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">This month</h1>
          <p className="mt-1 text-sm text-secondary">
            {fmt(ctx.periodStart)} – {fmt(ctx.periodEnd)}
            {existing ? " · editing saved review" : " · new review"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={ctx.stats.journalEntries} label="Journal" />
          <Stat value={ctx.stats.habitCheckIns} label="Habit check-ins" />
          <Stat value={ctx.stats.goalsCompleted} label="Goals done" />
          <Stat value={ctx.stats.weeklyReviews} label="Weekly reviews" />
        </div>

        <MonthlyReviewForm
          periodStart={ctx.periodStart.toISOString()}
          periodEnd={ctx.periodEnd.toISOString()}
          initial={{
            wins: String(content.wins ?? ""),
            challenges: String(content.challenges ?? ""),
            lessons: String(content.lessons ?? ""),
            gratitude: String(content.gratitude ?? ""),
            relationships: String(content.relationships ?? ""),
            growthAreas: String(content.growthAreas ?? ""),
            focusNextMonth: String(
              content.focusNextMonth ?? content.focusNextWeek ?? "",
            ),
            energy: typeof content.energy === "number" ? content.energy : null,
            notes: String(content.notes ?? ""),
          }}
        />
      </main>
    </div>
    </AppShell>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-2xl font-semibold text-[var(--text)]">{value}</p>
      <p className="text-xs text-secondary">{label}</p>
    </div>
  );
}
