"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Circle, Plus, Trash2 } from "lucide-react";

type Habit = {
  id: string;
  title: string;
  description: string | null;
  targetPerWeek: number;
  goalId: string | null;
  goal: { id: string; title: string; area: string } | null;
  doneToday: boolean;
};

type GoalOption = { id: string; title: string; area: string };

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalId, setGoalId] = useState("");
  const [targetPerWeek, setTargetPerWeek] = useState("7");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  async function load() {
    try {
      const [hRes, gRes] = await Promise.all([
        fetch("/api/habits"),
        fetch("/api/goals"),
      ]);
      const hData = await hRes.json();
      const gData = await gRes.json();
      if (!hRes.ok) throw new Error(hData.error || "Unable to load habits.");
      setHabits(hData.habits);
      if (gRes.ok) {
        setGoals(
          (gData.goals || []).map((g: GoalOption) => ({
            id: g.id,
            title: g.title,
            area: g.area,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load habits.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createHabit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          targetPerWeek: Number(targetPerWeek) || 7,
          goalId: goalId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create habit.");
      setHabits((list) => [data.habit, ...list]);
      setTitle("");
      setDescription("");
      setGoalId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create habit.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(habit: Habit) {
    setPending(habit.id);
    setError(null);
    try {
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !habit.doneToday }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update.");
      setHabits((list) =>
        list.map((h) => (h.id === habit.id ? { ...h, ...data.habit } : h)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update.");
    } finally {
      setPending(null);
    }
  }

  async function remove(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete.");
      }
      setHabits((list) => list.filter((h) => h.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    } finally {
      setPending(null);
    }
  }

  const doneCount = habits.filter((h) => h.doneToday).length;

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
          <span className="text-sm font-medium text-[var(--text)]">Habits</span>
          <span className="text-xs text-secondary">
            {doneCount}/{habits.length} today
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Daily habits</h1>
          <p className="mt-1 text-sm text-secondary">
            Small repeated actions that feed your goals. Check them off each day.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form
          onSubmit={createHabit}
          className="rounded-2xl border border-[var(--border)] bg-surface p-5 space-y-3"
        >
          <label className="block text-sm font-medium">
            New habit
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning prayer, Read 10 pages"
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">
            Note (optional)
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Target per week
              <input
                type="number"
                min={1}
                max={14}
                value={targetPerWeek}
                onChange={(e) => setTargetPerWeek(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium">
              Link to goal (optional)
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.area}: {g.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus size={16} /> {saving ? "Adding…" : "Add habit"}
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-secondary">Loading habits…</p>
        ) : habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center text-sm text-secondary">
            No habits yet. Add one that supports a goal or your vision.
          </div>
        ) : (
          <ul className="space-y-2">
            {habits.map((h) => (
              <li
                key={h.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-surface px-4 py-3"
              >
                <button
                  type="button"
                  disabled={pending === h.id}
                  onClick={() => void toggle(h)}
                  className="mt-0.5 text-primary disabled:opacity-40"
                  aria-label={h.doneToday ? "Undo" : "Mark done today"}
                >
                  {h.doneToday ? <Check size={18} /> : <Circle size={18} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      h.doneToday
                        ? "text-secondary line-through"
                        : "text-[var(--text)]"
                    }`}
                  >
                    {h.title}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {h.targetPerWeek}× / week
                    {h.goal ? ` · supports “${h.goal.title}”` : ""}
                    {h.doneToday ? " · done today" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending === h.id}
                  onClick={() => void remove(h.id)}
                  className="text-secondary hover:text-red-600"
                  aria-label="Delete habit"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
