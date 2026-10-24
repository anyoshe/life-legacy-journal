"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";

export type HierarchyGoal = {
  id: string;
  title: string;
  horizon?: string | null;
  status?: string;
  area?: string;
  currentValue?: number | null;
  targetValue?: number | null;
  unit?: string | null;
};

const HORIZONS = [
  { value: "", label: "No horizon" },
  { value: "LONG_TERM", label: "Long-term / 5+ years" },
  { value: "ANNUAL", label: "Annual" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "DAILY", label: "Daily" },
];

const AREAS = [
  "SPIRITUAL",
  "MARRIAGE",
  "FAMILY",
  "FINANCIAL",
  "CAREER",
  "BUSINESS",
  "PERSONAL",
  "HEALTH",
  "SOCIAL",
  "LEARNING",
  "SERVICE",
  "OTHER",
];

const TYPES = [
  { value: "NUMERIC", label: "Numeric" },
  { value: "YES_NO", label: "Yes / No" },
  { value: "MILESTONE", label: "Milestone" },
  { value: "FREQUENCY", label: "Frequency" },
  { value: "QUALITATIVE", label: "Qualitative" },
];

export function GoalHierarchyPanel({
  goalId,
  parent,
  supportingGoals,
  currentHorizon,
}: {
  goalId: string;
  parent: HierarchyGoal | null;
  supportingGoals: HierarchyGoal[];
  currentHorizon?: string | null;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [area, setArea] = useState(parent?.area ?? "FINANCIAL");
  const [horizon, setHorizon] = useState("MONTHLY");
  const [type, setType] = useState("NUMERIC");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("KES");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [horizonSaving, setHorizonSaving] = useState(false);

  async function createSupporting(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        area,
        type,
        parentGoalId: goalId,
        horizon: horizon || null,
        why: why.trim() || undefined,
      };
      if (targetValue.trim() !== "") {
        const n = Number(targetValue);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error("Target must be a number that is zero or greater.");
        }
        body.targetValue = n;
        body.unit = unit.trim() || undefined;
      }
      if (deadline) {
        body.deadline = new Date(deadline + "T12:00:00.000Z").toISOString();
      }

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Unable to create supporting goal.");
      }
      setTitle("");
      setWhy("");
      setTargetValue("");
      setDeadline("");
      setShowForm(false);
      const newId = data.goal?.id as string | undefined;
      if (newId) {
        router.push(`/goals/${newId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create supporting goal.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveHorizon(value: string) {
    setHorizonSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizon: value || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to update horizon.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update horizon.");
    } finally {
      setHorizonSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[var(--text)]">Hierarchy</h2>
      <p className="mt-1 text-xs text-secondary">
        Supporting goals nest under this one. Open a supporting goal to add
        milestones and actions — same as any other goal.
      </p>

      {parent && (
        <p className="mt-3 text-sm text-secondary">
          Parent:{" "}
          <Link
            href={`/goals/${parent.id}`}
            className="font-medium text-primary hover:underline"
          >
            {parent.title}
          </Link>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text)]">
          Supporting goals ({supportingGoals.length})
        </p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary"
        >
          <Plus size={14} /> Add supporting goal
        </button>
      </div>

      <div className="mt-3">
        <label className="text-xs font-medium text-secondary">
          Time horizon
          <select
            value={currentHorizon ?? ""}
            disabled={horizonSaving}
            onChange={(e) => void saveHorizon(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
          >
            {HORIZONS.map((h) => (
              <option key={h.value || "none"} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={createSupporting}
          className="mt-4 grid gap-3 rounded-xl border border-[var(--border)] bg-background p-4 sm:grid-cols-2"
        >
          <label className="text-sm font-medium sm:col-span-2">
            What do you want to accomplish? <span className="text-red-600">*</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clear all debts, Build emergency savings…"
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Why does this matter?
            <textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="Optional — your reason"
            />
          </label>
          <label className="text-sm font-medium">
            Life area
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Horizon
            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {HORIZONS.map((h) => (
                <option key={h.value || "none"} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Deadline
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium">
            Target amount (optional)
            <input
              type="number"
              min={0}
              step="any"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="e.g. 100000"
            />
          </label>
          <label className="text-sm font-medium">
            Unit
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="KES"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create supporting goal"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-4">
        {supportingGoals.length === 0 ? (
          <p className="text-sm text-secondary">
            No supporting goals yet. For Financial, open this page once to seed
            “Clear all debts” and “Build savings”, or add your own above.
          </p>
        ) : (
          <ul className="space-y-2">
            {supportingGoals.map((child) => {
              const hasNums =
                child.targetValue != null && Number(child.targetValue) > 0;
              const pct = hasNums
                ? Math.min(
                    100,
                    Math.round(
                      (Number(child.currentValue ?? 0) /
                        Number(child.targetValue)) *
                        100,
                    ),
                  )
                : null;
              return (
                <li key={child.id}>
                  <Link
                    href={`/goals/${child.id}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 transition hover:border-primary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-[var(--text)]">
                        {child.title}
                      </span>
                      <p className="mt-0.5 text-xs text-secondary">
                        Open full goal · milestones, actions, progress
                      </p>
                      {hasNums && (
                        <p className="mt-1 text-xs text-secondary">
                          {child.currentValue ?? 0}
                          {child.unit ? ` ${child.unit}` : ""} / {child.targetValue}
                          {child.unit ? ` ${child.unit}` : ""}
                          {pct != null ? ` · ${pct}%` : ""}
                        </p>
                      )}
                      {pct != null && (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full bg-[var(--primary)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <ArrowRight
                      size={16}
                      className="mt-1 shrink-0 text-secondary"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
