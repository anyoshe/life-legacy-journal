import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
import { getWeekContext } from "@/lib/week-review";
import { WeeklyGlance } from "@/components/WeeklyGlance";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function WeeklySummaryPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const ctx = await getWeekContext(user.id);

  return (
    <AppShell rightSlot={<UserButton />}>
    <MoodCanvas mood="reviews">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:h-14 sm:flex-nowrap sm:py-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary sm:text-sm"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="text-xs font-medium text-[var(--text)] sm:text-sm">Week glance</span>
          <Link href="/reviews/weekly" className="text-xs text-primary sm:text-sm">
            Full review
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[var(--border)] bg-surface/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <p className="eyebrow mb-2">Standings</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Where you stand this week
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {fmt(ctx.periodStart)} – {fmt(ctx.periodEnd)} · completed, pending,
            and journal activity — no AI narrative
          </p>
        </div>
        <WeeklyGlance data={ctx} />
      </main>
    </MoodCanvas>
      </AppShell>
  );
}
