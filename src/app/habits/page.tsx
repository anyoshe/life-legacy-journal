"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { UserButton } from "@clerk/nextjs";
import { Check, Flame, Leaf, Pencil, Plus, Sparkles, Target, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageMoodHeader } from "@/components/ui/PageMoodHeader";

type Habit = {
  id: string;
  title: string;
  description?: string | null;
  targetPerWeek: number;
  goalId?: string | null;
  goal?: { id: string; title: string; area: string } | null;
  contributionRole?: "KEY" | "SUPPORTING" | string;
  doneToday?: boolean;
  currentStreak?: number;
  bestStreak?: number;
  isActive?: boolean;
  streak?: number;
};

type GoalOption = { id: string; title: string; area: string };

type Tab = "today" | "all";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetPerWeek, setTargetPerWeek] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [goalId, setGoalId] = useState("");
  const [contributionRole, setContributionRole] = useState<"KEY" | "SUPPORTING">(
    "SUPPORTING",
  );
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTarget, setEditTarget] = useState(5);
  const [editGoalId, setEditGoalId] = useState("");
  const [editRole, setEditRole] = useState<"KEY" | "SUPPORTING">("SUPPORTING");
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [hRes, gRes] = await Promise.all([
        fetch("/api/habits"),
        fetch("/api/goals"),
      ]);
      const data = await hRes.json();
      if (!hRes.ok) throw new Error(data.error || "Unable to load habits.");
      setHabits(data.habits ?? []);
      if (gRes.ok) {
        const gData = await gRes.json();
        const raw = gData.goals ?? gData.data ?? gData;
        const list = Array.isArray(raw) ? raw : [];
        setGoals(
          list
            .filter((g: { id?: string; title?: string }) => g?.id && g?.title)
            .map((g: { id: string; title: string; area?: string }) => ({
              id: g.id,
              title: g.title,
              area: g.area ?? "",
            })),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load habits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createHabit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          targetPerWeek,
          goalId: goalId || null,
          contributionRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create habit.");
      setTitle("");
      setDescription("");
      setGoalId("");
      setContributionRole("SUPPORTING");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create habit.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(habit: Habit) {
    if (togglingId) return;
    setTogglingId(habit.id);
    setError(null);
    const next = !habit.doneToday;
    // Optimistic UI
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, doneToday: next } : h)),
    );
    try {
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update habit.");
      await load();
    } catch (err) {
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id ? { ...h, doneToday: habit.doneToday } : h,
        ),
      );
      setError(err instanceof Error ? err.message : "Could not update habit.");
    } finally {
      setTogglingId(null);
    }
  }

  const active = useMemo(
    () => habits.filter((h) => h.isActive !== false),
    [habits],
  );

  const doneTodayCount = active.filter((h) => h.doneToday).length;
  const bestStreak = Math.max(
    0,
    ...active.map((h) => h.bestStreak ?? h.currentStreak ?? h.streak ?? 0),
  );
  const currentStreakMax = Math.max(
    0,
    ...active.map((h) => h.currentStreak ?? h.streak ?? 0),
  );


  function openEdit(h: Habit) {
    setEditingHabit(h);
    setEditTitle(h.title);
    setEditDescription(h.description ?? "");
    setEditTarget(h.targetPerWeek || 5);
    setEditGoalId(h.goalId ?? "");
    setEditRole(
      h.contributionRole === "KEY" ? "KEY" : "SUPPORTING",
    );
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingHabit) return;
    setEditSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/habits/${editingHabit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          targetPerWeek: editTarget,
          goalId: editGoalId || null,
          contributionRole: editRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update habit.");
      setEditingHabit(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update habit.");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteHabit(h: Habit) {
    if (
      !confirm(
        `Remove “${h.title}”? Past check-ins for this habit will be deleted. Goal totals are not automatically rebuilt.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/habits/${h.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not delete habit.");
      }
      setEditingHabit(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete habit.");
    }
  }

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="habits">
        <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
          {/* A. Page introduction */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <PageMoodHeader
              accent="sage"
              eyebrow="My Life"
              title="My Habits"
              description="Small daily practices that compound into who you become."
            />
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {showForm ? "Close" : "New habit"}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          {/* B. Compact progress overview — only real data */}
          <section
            aria-label="Habit summary"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <SummaryCard
              icon={<Leaf className="h-4 w-4 text-[var(--secondary)]" />}
              label="Active"
              value={active.length}
            />
            <SummaryCard
              icon={<Check className="h-4 w-4 text-[var(--secondary)]" />}
              label="Done today"
              value={doneTodayCount}
              hint={
                active.length
                  ? `of ${active.length}`
                  : undefined
              }
            />
            <SummaryCard
              icon={<Flame className="h-4 w-4 text-amber-600" />}
              label="Current streak"
              value={currentStreakMax}
              hint="best among habits"
            />
            <SummaryCard
              icon={<Sparkles className="h-4 w-4 text-amber-600" />}
              label="Best streak"
              value={bestStreak}
            />
          </section>

          {/* Create form */}
          {showForm && (
            <form
              onSubmit={createHabit}
              className="card space-y-4 border border-[var(--border)] p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-[var(--text)]">
                Add a practice
              </p>
              <label className="block text-sm font-medium text-[var(--text)]">
                Name
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field mt-1.5 w-full"
                  placeholder="e.g. Morning prayer"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">
                Why it matters{" "}
                <span className="font-normal text-secondary">(optional)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="input-field mt-1.5 w-full"
                  placeholder="A short note on the benefit you seek…"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">
                Target days per week
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={targetPerWeek}
                  onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                  className="input-field mt-1.5 w-28"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">
                Linked goal{" "}
                <span className="font-normal text-secondary">(optional)</span>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="input-field mt-1.5 w-full"
                >
                  <option value="">No goal — practice only</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
              {goals.length === 0 ? (
                <p className="text-xs text-amber-800">
                  No goals available yet. Add one under <strong>Goals</strong>, then return
                  here to link this habit as Key or Supporting.
                </p>
              ) : (
                <p className="text-xs text-secondary">
                  {goals.length} goal{goals.length === 1 ? "" : "s"} available to link.
                </p>
              )}
              {goalId ? (
                <div className="text-sm">
                  <p className="font-medium text-[var(--text)]">Contribution to that goal</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setContributionRole("KEY")}
                      className={
                        contributionRole === "KEY"
                          ? "rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
                          : "rounded-full border border-[var(--border)] px-3 py-1.5 text-xs"
                      }
                    >
                      Key driver
                    </button>
                    <button
                      type="button"
                      onClick={() => setContributionRole("SUPPORTING")}
                      className={
                        contributionRole === "SUPPORTING"
                          ? "rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
                          : "rounded-full border border-[var(--border)] px-3 py-1.5 text-xs"
                      }
                    >
                      Supporting
                    </button>
                  </div>
                  <p className="mt-2 text-[0.7rem] text-muted">
                    Key = full weight toward the goal. Supporting ≈ 40% weight. Long goals
                    (e.g. 5 years) receive a smaller amount per day so consistent practice
                    fills the bar over time.
                  </p>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save habit"}
              </button>
            </form>
          )}

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
            <TabButton
              active={tab === "today"}
              onClick={() => setTab("today")}
              label="Today’s practice"
            />
            <TabButton
              active={tab === "all"}
              onClick={() => setTab("all")}
              label="All habits"
            />
          </div>

          {/* C / D. Habit cards */}
          {loading ? (
            <p className="text-sm text-secondary">Loading your practices…</p>
          ) : active.length === 0 ? (
            <EmptyState
              title="No habits yet"
              body="Start with one small practice you can return to most days."
              actionLabel="New habit"
              onAction={() => setShowForm(true)}
            />
          ) : tab === "today" &&
            active.length > 0 &&
            doneTodayCount === active.length ? (
            <div className="space-y-4">
              <p className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                All active habits are checked for today. Well done — consistency
                builds character.
              </p>
              <HabitGrid
                habits={active}
                togglingId={togglingId}
                onToggle={toggleComplete}
                onEdit={openEdit}
                onDelete={deleteHabit}
              />
            </div>
          ) : (
            <HabitGrid
              habits={
                tab === "today"
                  ? [...active].sort(
                      (a, b) => Number(a.doneToday) - Number(b.doneToday),
                    )
                  : active
              }
              togglingId={togglingId}
              onToggle={toggleComplete}
              onEdit={openEdit}
              onDelete={deleteHabit}
            />
          )}

          {/* F. Soft growth note — no fake forms */}
          <p className="text-center text-xs text-secondary">
            Streaks and weekly targets come from your real check-ins. Use{" "}
            <span className="font-medium text-[var(--text)]">Reviews</span> for
            deeper weekly reflection.
          </p>

          {editingHabit && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-habit-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) setEditingHabit(null);
              }}
            >
              <form
                onSubmit={saveEdit}
                className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2">
                  <p id="edit-habit-title" className="text-sm font-semibold text-[var(--text)]">
                    Edit habit
                  </p>
                  <button
                    type="button"
                    aria-label="Close"
                    className="rounded-full p-1 text-secondary hover:bg-[var(--border)]"
                    onClick={() => setEditingHabit(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <label className="block text-sm font-medium">
                  Name
                  <input
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="input-field mt-1 w-full"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Why it matters
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="input-field mt-1 w-full"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Days per week
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={editTarget}
                    onChange={(e) => setEditTarget(Number(e.target.value))}
                    className="input-field mt-1 w-28"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Linked goal
                  <select
                    value={editGoalId}
                    onChange={(e) => setEditGoalId(e.target.value)}
                    className="input-field mt-1 w-full"
                  >
                    <option value="">No goal — practice only</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </label>
                {editGoalId ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditRole("KEY")}
                      className={
                        editRole === "KEY"
                          ? "rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
                          : "rounded-full border border-[var(--border)] px-3 py-1.5 text-xs"
                      }
                    >
                      Key driver
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole("SUPPORTING")}
                      className={
                        editRole === "SUPPORTING"
                          ? "rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
                          : "rounded-full border border-[var(--border)] px-3 py-1.5 text-xs"
                      }
                    >
                      Supporting
                    </button>
                  </div>
                ) : null}
                {goals.length === 0 && (
                  <p className="text-xs text-amber-800">
                    No goals loaded. Create a goal under Goals first, then link it here.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="submit" disabled={editSaving} className="btn-primary">
                    {editSaving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-700"
                    onClick={() => editingHabit && void deleteHabit(editingHabit)}
                  >
                    Delete habit
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </MoodCanvas>
    </AppShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-secondary">
        {icon}
        <span className="text-[0.7rem] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--text)]">
        {value}
      </p>
      {hint && <p className="text-[0.65rem] text-muted">{hint}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-white"
          : "rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm font-medium text-[var(--text)] hover:border-[var(--primary)]/40"
      }
    >
      {label}
    </button>
  );
}

function HabitGrid({
  habits,
  togglingId,
  onToggle,
  onEdit,
  onDelete,
}: {
  habits: Habit[];
  togglingId: string | null;
  onToggle: (h: Habit) => void;
  onEdit: (h: Habit) => void;
  onDelete: (h: Habit) => void;
}) {
  if (habits.length === 0) {
    return (
      <EmptyState
        title="Nothing here"
        body="No habits match this view."
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {habits.map((h) => {
        const streak = h.currentStreak ?? h.streak ?? 0;
        const done = Boolean(h.doneToday);
        return (
          <li key={h.id}>
            <article
              className={
                done
                  ? "flex h-full flex-col rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4 shadow-sm"
                  : "flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
              }
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggle(h)}
                  disabled={togglingId === h.id}
                  aria-pressed={done}
                  aria-label={
                    done
                      ? `Mark ${h.title} incomplete for today`
                      : `Mark ${h.title} complete for today`
                  }
                  className={
                    done
                      ? "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60"
                      : "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--border)] bg-white text-transparent hover:border-[var(--secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:opacity-60"
                  }
                >
                  <Check className="h-5 w-5" aria-hidden />
                </button>
                <div className="min-w-0 flex-1">
                  <h2
                    className={
                      done
                        ? "font-semibold text-[var(--text)] line-through decoration-emerald-600/40"
                        : "font-semibold text-[var(--text)]"
                    }
                  >
                    {h.title}
                  </h2>
                  {h.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-secondary line-clamp-3">
                      {h.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-[0.7rem] text-secondary">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--border)]/50 px-2.5 py-1">
                  <Target className="h-3 w-3" aria-hidden />
                  {h.targetPerWeek}/week
                </span>
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-900">
                    <Flame className="h-3 w-3" aria-hidden />
                    {streak} day streak
                  </span>
                )}
                {h.goal?.title && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-900">
                    {h.goal.title}
                    {h.contributionRole === "KEY" ? " · key" : " · support"}
                  </span>
                )}
                {done && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">
                    Done today
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-2 border-t border-[var(--border)]/60 pt-3">
                <button
                  type="button"
                  onClick={() => onEdit(h)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)]/40"
                >
                  <Pencil className="h-3 w-3" aria-hidden />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(h)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                  Delete
                </button>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
      <Leaf className="mx-auto h-8 w-8 text-[var(--secondary)] opacity-80" />
      <p className="mt-3 text-base font-semibold text-[var(--text)]">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-secondary">{body}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary mt-5 rounded-full px-4 py-2 text-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
