import Link from "next/link";
import type { WeekGlance } from "@/lib/week-review";

function Stat({
  value,
  label,
  hint,
}: {
  value: string | number;
  label: string;
  hint?: string;
}) {
  return (
    <div className="card p-4 text-center">
      <p className="text-2xl font-semibold text-primary">{value}</p>
      <p className="text-xs text-secondary">{label}</p>
      {hint && <p className="mt-1 text-[0.65rem] text-muted">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  children,
  href,
  linkLabel,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        {href && (
          <Link href={href} className="text-xs font-medium text-primary">
            {linkLabel || "Open"}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function WeeklyGlance({ data }: { data: WeekGlance }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={data.journal.count} label="Journal entries" />
        <Stat
          value={`${data.actions.completedThisWeek}`}
          label="Actions done"
          hint={`${data.actions.openPending} still open`}
        />
        <Stat
          value={`${data.todos.completed}/${data.todos.completed + data.todos.pending}`}
          label="Day-list todos"
          hint={`${data.todos.pending} pending`}
        />
        <Stat
          value={`${data.habits.checkIns}/${data.habits.weeklyTargetSum || "—"}`}
          label="Habit check-ins"
          hint={`vs weekly targets`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={data.goals.active} label="Active goals" />
        <Stat
          value={data.goals.needsAttention}
          label="Need attention"
          hint={data.goals.needsAttention ? "Behind / needs focus" : "All calm"}
        />
        <Stat value={data.goals.completedThisWeek} label="Goals completed" />
        <Stat
          value={
            data.legacy.lessons + data.legacy.experiences + data.legacy.letters
          }
          label="Legacy captures"
          hint={`${data.legacy.lessons}L · ${data.legacy.experiences}E · ${data.legacy.letters} letters`}
        />
      </div>

      <Section title="Still pending — goal actions" href="/today" linkLabel="Today">
        {data.actions.pendingTitles.length === 0 ? (
          <p className="text-sm text-secondary">No open goal actions. Clear slate.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.actions.pendingTitles.slice(0, 12).map((a) => (
              <li key={a.id} className="text-[var(--text)]">
                <span className="text-secondary">{a.goalTitle}:</span> {a.title}
              </li>
            ))}
            {data.actions.pendingTitles.length > 12 && (
              <li className="text-xs text-secondary">
                +{data.actions.pendingTitles.length - 12} more
              </li>
            )}
          </ul>
        )}
      </Section>

      <Section title="Still pending — this week’s day list" href="/today">
        {data.todos.pendingItems.length === 0 ? (
          <p className="text-sm text-secondary">No pending day-list items this week.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.todos.pendingItems.slice(0, 12).map((t) => (
              <li key={t.id}>
                {t.timeOfDay && (
                  <span className="mr-2 font-medium text-primary">{t.timeOfDay}</span>
                )}
                {t.title}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Habits this week" href="/habits">
        {data.habits.byHabit.length === 0 ? (
          <p className="text-sm text-secondary">No active habits.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.habits.byHabit.map((h) => {
              const ok = h.checkIns >= h.targetPerWeek;
              return (
                <li key={h.id} className="flex justify-between gap-2">
                  <span>{h.title}</span>
                  <span className={ok ? "font-medium text-[var(--secondary)]" : "text-secondary"}>
                    {h.checkIns}/{h.targetPerWeek}
                    {ok ? " ✓" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {data.goals.needsAttentionList.length > 0 && (
        <Section title="Goals that need attention" href="/goals">
          <ul className="space-y-1.5 text-sm">
            {data.goals.needsAttentionList.map((g) => (
              <li key={g.id}>
                <Link href={`/goals/${g.id}`} className="text-primary hover:underline">
                  {g.title}
                </Link>
                <span className="ml-2 text-xs text-secondary">{g.status}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Journal this week" href="/entries">
        {data.journal.titles.length === 0 ? (
          <p className="text-sm text-secondary">No journal entries this week yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.journal.titles.map((e) => (
              <li key={e.id}>
                <Link href={`/entries/${e.id}`} className="text-primary hover:underline">
                  {e.title || "Untitled entry"}
                </Link>
                <span className="ml-2 text-xs text-secondary">
                  {new Date(e.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {data.actions.completedTitles.length > 0 && (
        <Section title="Completed actions this week">
          <ul className="space-y-1.5 text-sm text-secondary">
            {data.actions.completedTitles.slice(0, 15).map((a) => (
              <li key={`${a.id}-${a.title}`}>
                ✓ {a.goalTitle}: {a.title}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
