import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
import { getWeekContext } from "@/lib/week-review";
import { WeeklyGlance } from "@/components/WeeklyGlance";

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
    <div className="page-wash min-h-screen pb-nav">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="text-sm font-medium text-[var(--text)]">Week glance</span>
          <Link href="/reviews/weekly" className="text-sm text-primary">
            Full review
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
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
    </div>
  );
}
