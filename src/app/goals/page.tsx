"use client";

import { UserButton } from "@clerk/nextjs";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageMoodHeader } from "@/components/ui/PageMoodHeader";
import { StatStrip } from "@/components/ui/StatStrip";
import { lifeAreaMood } from "@/lib/nav-config";

type Goal = {
  id: string;
  title: string;
  area: string;
  type: string;
  why: string | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  deadline: string | null;
  status: string;
  canEdit: boolean;
  milestones?: { id: string; completed: boolean }[];
  actions?: { id: string; completed: boolean }[];
};

const areas = [
  "PERSONAL", "SPIRITUAL", "MARRIAGE", "FAMILY", "FINANCIAL", "CAREER",
  "BUSINESS", "LEARNING", "HEALTH", "SOCIAL", "SERVICE", "OTHER",
];
const types = ["YES_NO", "NUMERIC", "MILESTONE", "FREQUENCY", "HABIT", "QUALITATIVE"];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterArea, setFilterArea] = useState<string>("ALL");
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("PERSONAL");
  const [type, setType] = useState("YES_NO");
  const [why, setWhy] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [deadline, setDeadline] = useState("");

  async function loadGoals() {
    try {
      const response = await fetch("/api/goals");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load goals.");
      setGoals(data.goals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load goals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGoals();
  }, []);

  async function createGoal(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          area,
          type,
          why,
          unit: unit || undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          targetValue: targetValue ? Number(targetValue) : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create goal.");
      setShowForm(false);
      setTitle("");
      setWhy("");
      setTargetValue("");
      setUnit("");
      setDeadline("");
      await loadGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create goal.");
    } finally {
      setSaving(false);
    }
  }

  const active = goals.filter((g) => g.status !== "COMPLETED" && g.status !== "ARCHIVED");
  const completed = goals.filter((g) => g.status === "COMPLETED");

  const visible = useMemo(() => {
    if (filterArea === "ALL") return goals;
    return goals.filter((g) => g.area === filterArea);
  }, [goals, filterArea]);

  const areasPresent = useMemo(() => {
    const s = new Set(goals.map((g) => g.area));
    return areas.filter((a) => s.has(a));
  }, [goals]);

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="goals">
      {/* Wider workspace — non-dashboard only */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageMoodHeader
          accent="indigo"
          eyebrow="My Life"
          title="Goals"
          description="Directions that support your vision — scan the map, then open a goal to act."
          action={
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#312e81] shadow-sm"
            >
              <Plus size={16} /> New goal
            </button>
          }
        />

        <StatStrip
          items={[
            { label: "Active", value: active.length, tone: "indigo" },
            { label: "Completed", value: completed.length, tone: "sage" },
            { label: "Life areas", value: areasPresent.length, tone: "gold" },
          ]}
        />

        {/* Area filter chips — reduces empty vertical section stacking */}
        {areasPresent.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterArea("ALL")}
              className={
                filterArea === "ALL"
                  ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-full bg-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-secondary hover:text-[var(--text)]"
              }
            >
              All goals
            </button>
            {areasPresent.map((a) => {
              const mood = lifeAreaMood[a] ?? lifeAreaMood.OTHER;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setFilterArea(a)}
                  className={
                    filterArea === a
                      ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                      : "rounded-full bg-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-secondary hover:text-[var(--text)]"
                  }
                >
                  {mood.label}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {showForm && (
          <form onSubmit={createGoal} className="card grid gap-4 p-5 sm:grid-cols-2">
            <label className="text-sm font-medium sm:col-span-2">
              What do you want to accomplish?
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field mt-1.5"
              />
            </label>
            <label className="text-sm font-medium">
              Area
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="input-field mt-1.5"
              >
                {areas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              How will you track it?
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input-field mt-1.5"
              >
                {types.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Why does this matter?
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                rows={2}
                className="input-field mt-1.5"
              />
            </label>
            <label className="text-sm font-medium">
              Target value
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="input-field mt-1.5"
              />
            </label>
            <label className="text-sm font-medium">
              Unit
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="input-field mt-1.5"
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Deadline
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-field mt-1.5"
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? "Saving…" : "Create goal"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-secondary">Loading goals…</p>
        ) : visible.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-base font-semibold text-[var(--text)]">
              {filterArea === "ALL" ? "Choose one goal that matters" : "No goals in this area yet"}
            </p>
            <p className="mt-2 text-sm text-secondary">
              Start with a single direction under marriage, faith, health, or money.
            </p>
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary mt-4">
              Create a goal
            </button>
          </div>
        ) : (
          /* Dense responsive grid: 1 / 2 / 3 columns — all visible goals in one overview */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((goal) => {
              const mood = lifeAreaMood[goal.area] ?? lifeAreaMood.OTHER;
              const msDone = goal.milestones?.filter((m) => m.completed).length ?? 0;
              const msTotal = goal.milestones?.length ?? 0;
              const actOpen = goal.actions?.filter((a) => !a.completed).length ?? 0;
              const pct =
                msTotal > 0
                  ? Math.round((msDone / msTotal) * 100)
                  : goal.targetValue && goal.currentValue != null
                    ? Math.min(
                        100,
                        Math.round((Number(goal.currentValue) / Number(goal.targetValue)) * 100),
                      )
                    : null;
              return (
                <Link
                  key={goal.id}
                  href={`/goals/${goal.id}`}
                  className="group relative flex min-h-[11rem] flex-col overflow-hidden rounded-2xl shadow-sm transition hover:shadow-md"
                  style={{ background: mood.gradient }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  <div className="relative mt-auto flex flex-col p-4 text-white">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/80">
                      {mood.label} · {goal.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-base font-semibold leading-snug">{goal.title}</p>
                    {goal.why && (
                      <p className="mt-1 line-clamp-2 text-xs text-white/85">{goal.why}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-white/75">
                      {pct != null && <span>{pct}% milestones</span>}
                      {msTotal > 0 && <span>{msDone}/{msTotal} milestones</span>}
                      {actOpen > 0 && <span>{actOpen} open actions</span>}
                      {goal.deadline && (
                        <span>Due {new Date(goal.deadline).toLocaleDateString()}</span>
                      )}
                    </div>
                    {pct != null && (
                      <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-white/90"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      </MoodCanvas>
    </AppShell>
  );
}
