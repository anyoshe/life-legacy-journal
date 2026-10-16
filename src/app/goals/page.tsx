"use client";

import { UserButton } from "@clerk/nextjs";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
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

  const byArea = useMemo(() => {
    const map = new Map<string, Goal[]>();
    for (const g of goals) {
      const list = map.get(g.area) ?? [];
      list.push(g);
      map.set(g.area, list);
    }
    return map;
  }, [goals]);

  return (
    <AppShell rightSlot={<UserButton />}>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <PageMoodHeader
          accent="indigo"
          eyebrow="My Life"
          title="Goals"
          description="Directions that support your vision — organized by the areas of your life."
          action={
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--primary-dark)] shadow-sm"
            >
              <Plus size={16} /> New goal
            </button>
          }
        />

        <StatStrip
          items={[
            { label: "Active", value: active.length, tone: "indigo" },
            { label: "Completed", value: completed.length, tone: "sage" },
            { label: "Areas", value: byArea.size, tone: "gold" },
          ]}
        />

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={createGoal}
            className="card grid gap-4 p-5 sm:grid-cols-2"
          >
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
                placeholder="e.g. KES, books, sessions"
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
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-secondary">Loading goals…</p>
        ) : goals.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-base font-semibold text-[var(--text)]">
              Choose one goal that matters
            </p>
            <p className="mt-2 text-sm text-secondary">
              Marriage, faith, health, or money — start with a single direction.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              Create a goal
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {[...byArea.entries()].map(([areaKey, list]) => {
              const mood = lifeAreaMood[areaKey] ?? lifeAreaMood.OTHER;
              return (
                <section key={areaKey}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary">
                    {mood.label}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {list.map((goal) => {
                      const msDone =
                        goal.milestones?.filter((m) => m.completed).length ?? 0;
                      const msTotal = goal.milestones?.length ?? 0;
                      const actOpen =
                        goal.actions?.filter((a) => !a.completed).length ?? 0;
                      return (
                        <Link
                          key={goal.id}
                          href={`/goals/${goal.id}`}
                          className="group relative min-h-[8rem] overflow-hidden rounded-2xl shadow-sm transition hover:shadow-md"
                          style={{ background: mood.gradient }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                          <div className="relative flex h-full flex-col justify-end p-4 text-white">
                            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-white/80">
                              {goal.status.replaceAll("_", " ")}
                            </p>
                            <p className="mt-1 text-base font-semibold leading-snug">
                              {goal.title}
                            </p>
                            {goal.why && (
                              <p className="mt-1 line-clamp-2 text-xs text-white/80">
                                {goal.why}
                              </p>
                            )}
                            <p className="mt-2 text-[0.65rem] text-white/70">
                              {msTotal > 0 && `${msDone}/${msTotal} milestones · `}
                              {actOpen > 0 ? `${actOpen} open actions` : "Open goal"}
                              {goal.deadline
                                ? ` · due ${new Date(goal.deadline).toLocaleDateString()}`
                                : ""}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
}
