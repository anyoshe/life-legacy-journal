"use client";

import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Plus, Target } from "lucide-react";

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
  "PERSONAL",
  "SPIRITUAL",
  "MARRIAGE",
  "FAMILY",
  "FINANCIAL",
  "CAREER",
  "BUSINESS",
  "LEARNING",
  "HEALTH",
  "SOCIAL",
  "SERVICE",
  "OTHER",
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
      setGoals((current) => [data.goal, ...current]);
      setTitle("");
      setWhy("");
      setTargetValue("");
      setUnit("");
      setDeadline("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create goal.");
    } finally {
      setSaving(false);
    }
  }

  async function markComplete(goal: Goal, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const response = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to update goal.");
      return;
    }
    setGoals((current) =>
      current.map((item) => (item.id === goal.id ? data.goal : item)),
    );
  }

  return (
    <AppShell rightSlot={<UserButton />}>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 pb-8">
        <PageIntro
          eyebrow="My Life"
          title="Goals"
          description="Directions that support your vision — organized by the areas of your life."
        />

      <header className="border-b border-[var(--border)] bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="font-semibold text-primary">Goals</span>
          <button
            type="button"
            onClick={() => setShowForm((visible) => !visible)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} /> New goal
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text)]">Goals with a reason</h1>
          <p className="mt-1 text-sm text-secondary">
            Keep the outcome clear, then move it forward with milestones and actions.
          </p>
        </div>

        {showForm && (
          <form
            onSubmit={createGoal}
            className="mb-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-surface p-5 shadow-sm sm:grid-cols-2"
          >
            <label className="text-sm font-medium sm:col-span-2">
              What do you want to accomplish?
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium">
              Area
              <select
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
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
                onChange={(event) => setType(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
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
                onChange={(event) => setWhy(event.target.value)}
                rows={2}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>
            {type === "NUMERIC" && (
              <>
                <label className="text-sm font-medium">
                  Target
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={targetValue}
                    onChange={(event) => setTargetValue(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium">
                  Unit
                  <input
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    placeholder="KES, sessions, books"
                    className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
            <label className="text-sm font-medium">
              Deadline
              <input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-end gap-3">
              <button
                disabled={saving}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create goal"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-secondary">Loading your goals...</p>
        ) : goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
            <Target className="mx-auto mb-3 text-primary" />
            <h2 className="font-semibold text-[var(--text)]">Your goals will live here</h2>
            <p className="mt-1 text-sm text-secondary">
              Capture one meaningful outcome to begin.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {goals.map((goal) => {
              const progress =
                goal.targetValue && goal.targetValue > 0
                  ? Math.min(
                      100,
                      Math.round(((goal.currentValue || 0) / goal.targetValue) * 100),
                    )
                  : null;
              const mDone = goal.milestones?.filter((m) => m.completed).length ?? 0;
              const mTotal = goal.milestones?.length ?? 0;
              const aDone = goal.actions?.filter((a) => a.completed).length ?? 0;
              const aTotal = goal.actions?.length ?? 0;

              return (
                <Link
                  key={goal.id}
                  href={`/goals/${goal.id}`}
                  className="block rounded-2xl border border-[var(--border)] bg-surface p-5 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-primary">
                        {goal.area} · {goal.type.replaceAll("_", " ")}
                      </p>
                      <h2 className="mt-1 font-semibold text-[var(--text)]">{goal.title}</h2>
                    </div>
                    {goal.status === "COMPLETED" ? (
                      <span className="text-xs font-semibold text-[var(--success)]">
                        Complete
                      </span>
                    ) : goal.canEdit ? (
                      <button
                        type="button"
                        onClick={(e) => void markComplete(goal, e)}
                        aria-label={`Mark ${goal.title} complete`}
                        className="rounded border border-[var(--border)] p-1.5 text-secondary hover:text-primary"
                      >
                        <Check size={16} />
                      </button>
                    ) : (
                      <span className="text-xs text-secondary">Shared with you</span>
                    )}
                  </div>
                  {goal.why && (
                    <p className="mt-3 line-clamp-2 text-sm text-secondary">{goal.why}</p>
                  )}
                  {progress !== null && (
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-secondary">
                        <span>
                          {goal.currentValue || 0} / {goal.targetValue} {goal.unit || ""}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                        <div
                          className="h-full bg-[var(--growth)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-secondary">
                    {goal.deadline && (
                      <span>Due {new Date(goal.deadline).toLocaleDateString()}</span>
                    )}
                    {mTotal > 0 && (
                      <span>
                        {mDone}/{mTotal} milestones
                      </span>
                    )}
                    {aTotal > 0 && (
                      <span>
                        {aDone}/{aTotal} actions
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
    </AppShell>
  );
}
