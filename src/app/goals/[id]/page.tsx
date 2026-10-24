"use client";

import { RECURRENCE_OPTIONS, periodLabel } from "@/lib/action-period";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Circle, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { GoalHierarchyPanel } from "@/components/goals/GoalHierarchyPanel";
import { GoalAlignmentPanel } from "@/components/goals/GoalAlignmentPanel";
import { GoalRollupSummary } from "@/components/goals/GoalRollupSummary";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  targetDate: string | null;
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
  const [milestoneTargetDate, setMilestoneTargetDate] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [actionDue, setActionDue] = useState("");
  const [actionRecurrence, setActionRecurrence] = useState("ONCE");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [actionTime, setActionTime] = useState("");
  const [actionContribution, setActionContribution] = useState("");
  const [currentValueInput, setCurrentValueInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editWhy, setEditWhy] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editStatus, setEditStatus] = useState("");

  function startEdit(g: Goal) {
    setEditTitle(g.title);
    setEditWhy(g.why ?? "");
    setEditDescription(g.description ?? "");
    setEditTarget(g.targetValue != null ? String(g.targetValue) : "");
    setEditUnit(g.unit ?? "");
    setEditDeadline(g.deadline ? g.deadline.slice(0, 10) : "");
    setEditStatus(g.status);
    setEditing(true);
  }

  async function saveGoalEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) {
      setError("Title is required.");
      return;
    }
    const body: Record<string, unknown> = {
      title: editTitle.trim(),
      why: editWhy.trim() || null,
      description: editDescription.trim() || null,
      unit: editUnit.trim() || null,
      status: editStatus || undefined,
      deadline: editDeadline
        ? new Date(editDeadline + "T12:00:00.000Z").toISOString()
        : null,
    };
    if (editTarget.trim() !== "") {
      const n = Number(editTarget);
      if (!Number.isFinite(n) || n < 0) {
        setError("Target must be a non-negative number.");
        return;
      }
      body.targetValue = n;
    } else {
      body.targetValue = null;
    }
    const ok = await patch(body);
    if (ok) setEditing(false);
  }

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
    const ok = await patch({
      addMilestone: {
        title: milestoneTitle.trim(),
        targetDate: milestoneTargetDate
          ? new Date(milestoneTargetDate + "T12:00:00.000Z").toISOString()
          : undefined,
      },
    });
    if (ok) {
      setMilestoneTitle("");
      setMilestoneTargetDate("");
    }
  }

  async function setMilestoneDue(milestoneId: string, dateStr: string) {
    await patch({
      milestoneTargetDate: {
        milestoneId,
        targetDate: dateStr
          ? new Date(dateStr + "T12:00:00.000Z").toISOString()
          : null,
      },
    });
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
      <AppShell rightSlot={<UserButton />}>
        <MoodCanvas mood="goals">
          <main className="flex min-h-screen items-center justify-center text-sm text-secondary">
            Loading goal…
          </main>
        </MoodCanvas>
      </AppShell>
    );
  }

  if (!goal) {
    return (
      <AppShell rightSlot={<UserButton />}>
        <MoodCanvas mood="goals">
          <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
            <p className="text-[var(--text)]">{error || "Goal not found."}</p>
            <Link href="/goals" className="mt-4 inline-block text-sm text-primary">
              Back to goals
            </Link>
          </main>
        </MoodCanvas>
      </AppShell>
    );
  }

  const progress =
    goal.targetValue && goal.targetValue > 0
      ? Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetValue) * 100))
      : null;

  const milestoneDone = goal.milestones.filter((m) => m.completed).length;
  const actionDone = goal.actions.filter((a) => a.completed).length;

  return (
    <AppShell rightSlot={<UserButton />}>
    <MoodCanvas mood="goals">
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
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

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}


        {goal.area === "FINANCIAL" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--achievement)]/30 bg-[var(--surface-gold)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Financial tracker</p>
              <p className="text-xs text-secondary">
                Creditors, money you have, expenses, and payments live in the Finance hub.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/finance?tab=creditors"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Open financial tracker
              </Link>
              <Link
                href="/finance"
                className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--text)]"
              >
                Overview
              </Link>
            </div>
          </div>
        )}

        {/* Overview — view or edit core fields */}
        <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {goal.area.replaceAll("_", " ")} · {goal.type.replaceAll("_", " ")}
              </p>
              {!editing && (
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">
                  {goal.title}
                </h1>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!editing && (
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
              )}
              {goal.canEdit && !editing && (
                <button
                  type="button"
                  onClick={() => startEdit(goal)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-background px-3 py-1.5 text-sm font-semibold text-primary hover:bg-[var(--private-bg)]"
                >
                  <Pencil size={14} aria-hidden />
                  Edit goal
                </button>
              )}
            </div>
          </div>

          {editing ? (
            <form onSubmit={saveGoalEdit} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-[var(--text)]">
                Title
                <input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input-field mt-1 w-full"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">
                Why this matters
                <textarea
                  rows={2}
                  value={editWhy}
                  onChange={(e) => setEditWhy(e.target.value)}
                  className="input-field mt-1 w-full"
                  placeholder="Purpose behind this goal"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">
                Description
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input-field mt-1 w-full"
                  placeholder="Details, notes, definition of done…"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm font-medium text-[var(--text)]">
                  Target
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    className="input-field mt-1 w-full"
                    placeholder="Optional"
                  />
                </label>
                <label className="block text-sm font-medium text-[var(--text)]">
                  Unit
                  <input
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="input-field mt-1 w-full"
                    placeholder="e.g. KES, kg, sessions"
                  />
                </label>
                <label className="block text-sm font-medium text-[var(--text)]">
                  Deadline
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="input-field mt-1 w-full"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-[var(--text)]">
                Status
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="input-field mt-1 w-full"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(false)}
                  className="btn-secondary inline-flex items-center gap-1.5 text-sm"
                >
                  <X size={14} aria-hidden />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          ) : (
            <>
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
            </>
          )}

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
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-secondary">
                      {m.targetDate ? (
                        <span
                          className={
                            !m.completed &&
                            new Date(m.targetDate) < new Date()
                              ? "font-medium text-amber-700"
                              : ""
                          }
                        >
                          Target: {formatDate(m.targetDate)}
                          {!m.completed &&
                          new Date(m.targetDate) < new Date()
                            ? " · overdue"
                            : ""}
                        </span>
                      ) : (
                        <span className="text-muted">No target date</span>
                      )}
                      {goal.canEdit && (
                        <label className="inline-flex items-center gap-1">
                          <span className="sr-only">Set target date</span>
                          <input
                            type="date"
                            disabled={saving}
                            defaultValue={
                              m.targetDate ? m.targetDate.slice(0, 10) : ""
                            }
                            onChange={(e) =>
                              void setMilestoneDue(m.id, e.target.value)
                            }
                            className="rounded border border-[var(--border)] bg-background px-1.5 py-0.5 text-xs"
                          />
                        </label>
                      )}
                    </div>
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
            <form
              onSubmit={addMilestone}
              className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <label className="min-w-[12rem] flex-1 text-xs font-medium text-secondary">
                Milestone
                <input
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="New milestone…"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
              <label className="text-xs font-medium text-secondary">
                Target date
                <input
                  type="date"
                  value={milestoneTargetDate}
                  onChange={(e) => setMilestoneTargetDate(e.target.value)}
                  className="mt-1 block rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
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
          <p className="mb-3 text-xs text-secondary">
            Track once, daily, weekly, monthly, quarterly, or yearly. Checking off applies to
            the current period and feeds this goal&apos;s progress.
          </p>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {[
              { id: "ALL", label: "All" },
              { id: "DAILY", label: "Daily" },
              { id: "WEEKLY", label: "Weekly" },
              { id: "MONTHLY", label: "Monthly" },
              { id: "QUARTERLY", label: "Quarterly" },
              { id: "YEARLY", label: "Yearly" },
              { id: "ONCE", label: "Once" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActionFilter(f.id)}
                className={
                  actionFilter === f.id
                    ? "rounded-full bg-[var(--primary)] px-2.5 py-1 text-[0.7rem] font-semibold text-white"
                    : "rounded-full border border-[var(--border)] px-2.5 py-1 text-[0.7rem] text-[var(--text)]"
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {goal.actions.length === 0 ? (
            <p className="text-sm text-secondary">
              Add concrete next steps so this goal moves.
            </p>
          ) : (
            <ul className="space-y-2">
              {goal.actions
                .filter((a) => {
                  if (actionFilter === "ALL") return true;
                  if (actionFilter === "DAILY")
                    return ["DAILY", "WEEKDAYS", "CUSTOM_DAYS"].includes(
                      a.recurrence || "ONCE",
                    );
                  return (a.recurrence || "ONCE") === actionFilter;
                })
                .map((a) => {
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
                        {recurring
                          ? ` · ${isDone ? "done" : "due"} ${periodLabel(a.recurrence || "DAILY")}`
                          : ""}
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
    </AppShell>
  );
}