import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

const periods = [
  {
    href: "/summary/weekly",
    title: "Week glance",
    body: "Completed, pending, habits, and journal — from your week’s data.",
  },
  {
    href: "/reviews/weekly",
    title: "Weekly review",
    body: "Wins, challenges, and focus for next week.",
  },
  {
    href: "/reviews/monthly",
    title: "Monthly review",
    body: "A wider look at progress and attention.",
  },
  {
    href: "/reviews/annual",
    title: "Annual review",
    body: "Look back across the year with honesty and hope.",
  },
];

export default async function ReviewsHubPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  return (
    <AppShell rightSlot={<UserButton />}>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <header>
          <p className="eyebrow mb-2">Reflection</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Reviews
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Personal reflection — not business reporting.
          </p>
        </header>
        <ul className="space-y-3">
          {periods.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="card-interactive block p-5">
                <h2 className="font-semibold text-[var(--text)]">{p.title}</h2>
                <p className="mt-1 text-sm text-secondary">{p.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </AppShell>
  );
}
