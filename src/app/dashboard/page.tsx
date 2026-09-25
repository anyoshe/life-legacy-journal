import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const firstName = user.firstName || "Friend";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-[var(--border)] bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-primary tracking-tight">
              Life & Legacy
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary hidden sm:inline">
              {user.emailAddresses[0]?.emailAddress}
            </span>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Greeting */}
        <div className="mb-10">
          <p className="text-sm text-secondary mb-1">{today}</p>
          <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight">
            Good {getGreeting()}, {firstName}
          </h1>
          <p className="text-secondary mt-2 max-w-xl">
            A meaningful life is built one day at a time.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <a
            href="/entry/new"
            className="card-elevated p-6 hover:border-primary/30 transition-colors group"
          >
            <div className="text-2xl mb-3">📔</div>
            <h3 className="font-semibold text-[var(--text)] group-hover:text-primary transition-colors">
              New Daily Entry
            </h3>
            <p className="text-sm text-secondary mt-1">
              Capture today’s reflections, gratitude and priorities
            </p>
          </a>

          <a
            href="/goals"
            className="card-elevated p-6 hover:border-primary/30 transition-colors group"
          >
            <div className="text-2xl mb-3">🎯</div>
            <h3 className="font-semibold text-[var(--text)] group-hover:text-primary transition-colors">
              Goals
            </h3>
            <p className="text-sm text-secondary mt-1">
              Review and update your SMART goals
            </p>
          </a>

          <a
            href="/marriage"
            className="card-elevated p-6 hover:border-primary/30 transition-colors group"
          >
            <div className="text-2xl mb-3">❤️</div>
            <h3 className="font-semibold text-[var(--text)] group-hover:text-primary transition-colors">
              Marriage
            </h3>
            <p className="text-sm text-secondary mt-1">
              Shared vision, appreciation and growth together
            </p>
          </a>
        </div>

        {/* Placeholder growth overview */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
            Today’s growth
          </h2>
          <div className="card p-6 space-y-5">
            {[
              { area: "Spiritual", emoji: "🙏", color: "var(--area-spiritual)", value: 0 },
              { area: "Marriage", emoji: "❤️", color: "var(--area-marriage)", value: 0 },
              { area: "Financial", emoji: "💰", color: "var(--area-financial)", value: 0 },
              { area: "Personal", emoji: "🧠", color: "var(--area-personal)", value: 0 },
            ].map((item) => (
              <div key={item.area}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-[var(--text)]">
                    {item.emoji} {item.area}
                  </span>
                  <span className="text-secondary">{item.value}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted pt-2">
              Progress will appear here once you start writing daily entries and tracking goals.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
