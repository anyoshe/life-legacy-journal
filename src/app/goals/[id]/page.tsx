"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Circle,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { GoalHierarchyPanel } from "@/components/goals/GoalHierarchyPanel";
import { GoalAlignmentPanel } from "@/components/goals/GoalAlignmentPanel";
import { GoalRollupSummary } from "@/components/goals/GoalRollupSummary";
import { MoodCanvas } from "@/components/ui/MoodCanvas";

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  completed: boolean;
  completedAt: string | null;
};

type Action = {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  notes: string | null;
  recurrence?: string;
  daysOfWeek?: number[];
  timeOfDay?: string | null;
  contributionValue?: number | null;
  doneToday?: boolean;
};

type HierarchyRef = {
  id: string;
  title: string;
  horizon?: string | null;
  status?: string;
  area?: string;
  currentValue?: number | null;
  targetValue?: number | null;
  unit?: string | null;
};

type Goal = {
  id: string;
  title: string;
  description: string | null;
  area: string;
  type: string;
  why: string | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  deadline: string | null;
  status: string;
  horizon?: string | null;
  alignment?: string | null;
  alignmentNote?: string | null;
  parentGoalId?: string | null;
  parentGoal?: HierarchyRef | null;
  childGoals?: HierarchyRef[];
  canEdit: boolean;
  milestones: Milestone[];
  actions: Action[];
  createdAt: string;
  updatedAt: string;
};

const STATUSES = [
  "ACTIVE",
  "ON_TRACK",
  "NEEDS_ATTENTION",
  "BEHIND",
  "COMPLETED",
  "ARCHIVED",
  "ABANDONED",
];

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const goalId = params.id;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [foundationVision, setFoundationVision] = useState<string | null>(null);
  const [foundationMission, setFoundationMission] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [actionDue, setActionDue] = useState("");
  const [actionRecurrence, setActionRecurrence] = useState("ONCE");
  const [actionTime, setActionTime] = useState("");
  const [actionContribution, setActionContribution] = useState("");
  const [currentValueInput, setCurrentValueInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/goals/${goalId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Goal not found.");
      setGoal(data.goal)
        // foundation for alignment context (non-blocking)
        fetch("/api/foundation")
          .then((r) => (r.ok ? r.json() : null))
          .then((f) => {
            if (!f) return;
            setFoundationVision(f.foundation?.vision ?? f.vision ?? null);
            setFoundationMission(f.foundation?.mission ?? f.mission ?? null);
          })
          .catch(() => {});
      setCurrentValueInput(
        data.goal.currentValue != null ? String(data.goal.currentValue) : "",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load goal.");
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed.");
      setGoal(data.goal)
        // foundation for alignment context (non-blocking)
        fetch("/api/foundation")
          .then((r) => (r.ok ? r.json() : null))
          .then((f) => {
            if (!f) return;
            setFoundationVision(f.foundation?.vision ?? f.vision ?? null);
            setFoundationMission(f.foundation?.mission ?? f.mission ?? null);
          })
          .catch(() => {});
      if (data.goal.currentValue != null) {
        setCurrentValueInput(String(data.goal.currentValue));
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addMilestone(event: FormEvent) {
    event.preventDefault();
    if (!milestoneTitle.trim()) return;
    const ok = await patch({ addMilestone: { title: milestoneTitle.trim() } });
    if (ok) setMilestoneTitle("");
  }

  async function addAction(event: FormEvent) {
    event.preventDefault();
    if (!actionTitle.trim()) return;
    const ok = await patch({
      addAction: {
        title: actionTitle.trim(),
        dueDate: actionDue ? new Date(actionDue).toISOString() : undefined,
        recurrence: actionRecurrence,
        timeOfDay: actionTime || null,
        contributionValue: actionContribution ? Number(actionContribution) : null,
      },
    });
    if (ok) {
      setActionTitle("");
      setActionDue("");
      setActionRecurrence("ONCE");
      setActionTime("");
      setActionContribution("");
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const response = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete goal.");
      }
      router.push("/goals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete goal.");
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <MoodCanvas mood="goals">
        <main className="flex min-h-screen items-center justify-center text-sm text-secondary">
          Loading goal…
        </main>
      </MoodCanvas>
    );
  }

  if (!goal) {
    return (
      <MoodCanvas mood="goals">
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-[var(--text)]">{error || "Goal not found."}</p>
          <Link href="/goals" className="mt-4 inline-block text-sm text-primary">
            Back to goals
          </Link>
        </main>
      </MoodCanvas>
    );
  }

  const progress =
    goal.targetValue && goal.targetValue > 0
      ? Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetValue) * 100))
      : null;

  const milestoneDone = goal.milestones.filter((m) => m.completed).length;
  const actionDone = goal.actions.filter((a) => a.completed).length;

  return (
    <MoodCanvas mood="goals">
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link
            href="/goals"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Goals
          </Link>
          <span className="text-sm font-medium text-[var(--text)]">Goal</span>
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Overview */}
        <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {goal.area.replaceAll("_", " ")} · {goal.type.replaceAll("_", " ")}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">
                {goal.title}
              </h1>
            </div>
            <select
              value={goal.status}
              disabled={saving || !goal.canEdit}
              onChange={(e) => void patch({ status: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-background px-3 py-1.5 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {goal.why && (
            <p className="mt-4 text-sm leading-6 text-secondary">
              <span className="font-medium text-[var(--text)]">Why: </span>
              {goal.why}
            </p>
          )}
          {goal.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-secondary">
              {goal.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-secondary">
            {goal.deadline && <span>Deadline: {formatDate(goal.deadline)}</span>}
            <span>
              Milestones: {milestoneDone}/{goal.milestones.length}
            </span>
            <span>
              Actions: {actionDone}/{goal.actions.length}
            </span>
          </div>

          {progress !== null && (
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-secondary">
                <span>
                  {goal.currentValue || 0} / {goal.targetValue} {goal.unit || ""}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                <div
                  className="h-full bg-[var(--growth)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {goal.canEdit && (
                <form
                  className="mt-3 flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(currentValueInput);
                    if (!Number.isFinite(n) || n < 0) return;
                    void patch({ currentValue: n });
                  }}
                >
                  <label className="text-xs font-medium text-secondary">
                    Update progress
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={currentValueInput}
                      onChange={(e) => setCurrentValueInput(e.target.value)}
                      className="mt-1 block w-32 rounded-lg border border-[var(--border)] bg-background px-3 py-1.5 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                </form>
              )}
            </div>
          )}
        </section>


        <GoalAlignmentPanel
          goalId={goal.id}
          alignment={goal.alignment}
          alignmentNote={goal.alignmentNote}
          vision={foundationVision}
          mission={foundationMission}
        />

        <GoalHierarchyPanel
          goalId={goal.id}
          parent={goal.parentGoal ?? null}
          supportingGoals={goal.childGoals ?? []}
          currentHorizon={goal.horizon}
        />

        <GoalRollupSummary
          supportingGoals={goal.childGoals ?? []}
          parentUnit={goal.unit}
          parentCurrent={goal.currentValue}
          parentTarget={goal.targetValue}
        />

        {/* Milestones */}
        <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <Target size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-[var(--text)]">Milestones</h2>
          </div>

          {goal.milestones.length === 0 ? (
            <p className="text-sm text-secondary">
              Break this goal into clear milestones when you are ready.
            </p>
          ) : (
            <ul className="space-y-2">
              {goal.milestones.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-background px-3 py-2.5"
                >
                  <button
                    type="button"
                    disabled={saving || !goal.canEdit}
                    onClick={() =>
                      void patch({ milestoneId: m.id, completed: !m.completed })
                    }
                    className="mt-0.5 text-primary disabled:opacity-40"
                    aria-label={m.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {m.completed ? <Check size={18} /> : <Circle size={18} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        m.completed ? "text-secondary line-through" : "text-[var(--text)]"
                      }`}
                    >
                      {m.title}
                    </p>
                    {m.description && (
                      <p className="mt-0.5 text-xs text-secondary">{m.description}</p>
                    )}
                  </div>
                  {goal.canEdit && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void patch({ deleteMilestoneId: m.id })}
                      className="text-secondary hover:text-red-600"
                      aria-label="Delete milestone"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {goal.canEdit && (
            <form onSubmit={addMilestone} className="mt-4 flex gap-2">
              <input
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="New milestone…"
                className="flex-1 rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={saving || !milestoneTitle.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Plus size={16} /> Add
              </button>
            </form>
          )}
        </section>

        {/* Actions */}
        <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
          <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">Actions</h2>
          <p className="mb-4 text-xs text-secondary">
            Once, daily, or weekdays. Checking off feeds this goal&apos;s progress (numeric,
            frequency, yes/no).
          </p>

          {goal.actions.length === 0 ? (
            <p className="text-sm text-secondary">
              Add concrete next steps so this goal moves.
            </p>
          ) : (
            <ul className="space-y-2">
              {goal.actions.map((a) => {
                const recurring = a.recurrence && a.recurrence !== "ONCE";
                const isDone = recurring ? !!a.doneToday : a.completed;
                return (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-background px-3 py-2.5"
                  >
                    <button
                      type="button"
                      disabled={saving || !goal.canEdit}
                      onClick={() =>
                        void patch({ actionId: a.id, completed: !isDone })
                      }
                      className="mt-0.5 text-primary disabled:opacity-40"
                      aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                    >
                      {isDone ? <Check size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          isDone ? "text-secondary line-through" : "text-[var(--text)]"
                        }`}
                      >
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-xs text-secondary">
                        {(a.recurrence || "ONCE").replaceAll("_", " ").toLowerCase()}
                        {a.timeOfDay ? ` · ${a.timeOfDay}` : ""}
                        {a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ""}
                        {a.contributionValue
                          ? ` · +${a.contributionValue} toward goal`
                          : ""}
                        {recurring && a.doneToday ? " · done today" : ""}
                      </p>
                    </div>
                    {goal.canEdit && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void patch({ deleteActionId: a.id })}
                        className="text-secondary hover:text-red-600"
                        aria-label="Delete action"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {goal.canEdit && (
            <form onSubmit={addAction} className="mt-4 space-y-2">
              <input
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="Next action…"
                className="w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs text-secondary">
                  Schedule
                  <select
                    value={actionRecurrence}
                    onChange={(e) => setActionRecurrence(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
                  >
                    <option value="ONCE">Once</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKDAYS">Weekdays</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </label>
                <label className="text-xs text-secondary">
                  Time (optional)
                  <input
                    type="time"
                    value={actionTime}
                    onChange={(e) => setActionTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-secondary">
                  Due date (optional)
                  <input
                    type="date"
                    value={actionDue}
                    onChange={(e) => setActionDue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-secondary">
                  Progress amount
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={actionContribution}
                    onChange={(e) => setActionContribution(e.target.value)}
                    placeholder="e.g. 1"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={saving || !actionTitle.trim()}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Plus size={16} /> Add action
              </button>
            </form>
          )}
        </section>

        {/* Delete */}
        {goal.canEdit && (
          <section className="border-t border-[var(--border)] pt-6">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 size={14} /> Delete goal
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  Delete this goal and its milestones/actions? This cannot be undone.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleDelete()}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-3 py-1.5 text-sm text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
    </MoodCanvas>
  );
}
