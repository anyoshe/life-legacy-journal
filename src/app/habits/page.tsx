"use client";

import { UserButton } from "@clerk/nextjs";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageMoodHeader } from "@/components/ui/PageMoodHeader";
import { StatStrip } from "@/components/ui/StatStrip";

type Habit = {
  id: string;
  title: string;
  targetPerWeek: number;
  isActive: boolean;
  streak?: number;
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [targetPerWeek, setTargetPerWeek] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/habits");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load habits.");
      setHabits(data.habits ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load habits.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createHabit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, targetPerWeek }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create habit.");
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create habit.");
    } finally {
      setSaving(false);
    }
  }

  const active = habits.filter((h) => h.isActive !== false);
  const bestStreak = Math.max(0, ...active.map((h) => h.streak ?? 0));

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="habits">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageMoodHeader
          accent="sage"
          eyebrow="My Life"
          title="Habits"
          description="Small daily practices that compound into who you become."
        />
        <StatStrip
          items={[
            { label: "Active habits", value: active.length, tone: "sage" },
            { label: "Best streak", value: bestStreak, tone: "gold" },
          ]}
        />
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <form onSubmit={createHabit} className="card flex flex-wrap items-end gap-3 p-4">
          <label className="min-w-[12rem] flex-1 text-sm font-medium">
            New habit
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field mt-1.5"
              placeholder="e.g. Morning prayer"
            />
          </label>
          <label className="text-sm font-medium">
            Per week
            <input
              type="number"
              min={1}
              max={14}
              value={targetPerWeek}
              onChange={(e) => setTargetPerWeek(Number(e.target.value))}
              className="input-field mt-1.5 w-24"
            />
          </label>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? "Saving…" : "Add"}
          </button>
        </form>
        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : active.length === 0 ? (
          <div className="card p-8 text-center text-sm text-secondary">
            No habits yet. Add one practice you want to nurture.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((h) => (
              <li key={h.id} className="card card-tint-sage p-4">
                <p className="font-semibold text-[var(--text)]">{h.title}</p>
                <p className="mt-1 text-xs text-secondary">
                  Target {h.targetPerWeek}/week
                  {typeof h.streak === "number" ? ` · streak ${h.streak}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
      </MoodCanvas>
    </AppShell>
  );
}
