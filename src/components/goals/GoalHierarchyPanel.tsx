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
  const [area, setArea] = useState(parent?.area ?? "PERSONAL");
  const [horizon, setHorizon] = useState("MONTHLY");
  const [type, setType] = useState("NUMERIC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [horizonSaving, setHorizonSaving] = useState(false);

  async function createSupporting(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          area,
          type,
          parentGoalId: goalId,
          horizon: horizon || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create supporting goal.");
      setTitle("");
      setShowForm(false);
      router.refresh();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create supporting goal.");
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update horizon.");
      router.refresh();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update horizon.");
    } finally {
      setHorizonSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Hierarchy</h2>
          <p className="mt-1 text-xs text-secondary">
            Supporting goals nest under this one. Prefer actions for daily tasks.
          </p>
        </div>
        <label className="text-xs font-medium text-secondary">
          Time horizon
          <select
            className="ml-2 rounded-lg border border-[var(--border)] bg-background px-2 py-1.5 text-sm text-[var(--text)]"
            defaultValue={currentHorizon ?? ""}
            disabled={horizonSaving}
            onChange={(e) => void saveHorizon(e.target.value)}
          >
            {HORIZONS.map((h) => (
              <option key={h.value || "none"} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {parent && (
        <div className="rounded-xl border border-[var(--border)] bg-background px-3 py-2 text-sm">
          <p className="text-xs text-secondary">Parent goal</p>
          <Link
            href={`/goals/${parent.id}`}
            className="mt-0.5 inline-flex items-center gap-1 font-medium text-primary"
          >
            {parent.title}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
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

        {error && (
          <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={createSupporting}
            className="mb-3 space-y-2 rounded-xl border border-[var(--border)] bg-background p-3"
          >
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Supporting outcome"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
              >
                {HORIZONS.filter((h) => h.value).map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
              >
                <option value="NUMERIC">Numeric</option>
                <option value="YES_NO">Yes / No</option>
                <option value="MILESTONE">Milestone</option>
                <option value="FREQUENCY">Frequency</option>
                <option value="QUALITATIVE">Qualitative</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create"}
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

        {supportingGoals.length === 0 ? (
          <p className="text-sm text-secondary">
            No supporting goals yet. Add ones such as clearing debt, savings,
            budgeting, or investing — each opens as its own goal for milestones
            and actions.
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
                    className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 transition hover:border-primary/40 hover:bg-[var(--background)]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-[var(--text)]">
                        {child.title}
                      </span>
                      <p className="mt-0.5 text-xs text-secondary">
                        {[child.horizon?.replaceAll("_", " "), child.status]
                          .filter(Boolean)
                          .join(" · ") || "Sub-goal"}
                        {" · Open to add milestones & actions"}
                      </p>
                      {hasNums && (
                        <p className="mt-1 text-xs text-secondary">
                          {child.currentValue ?? 0}
                          {child.unit ? ` ${child.unit}` : ""}
                          {" / "}
                          {child.targetValue}
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
