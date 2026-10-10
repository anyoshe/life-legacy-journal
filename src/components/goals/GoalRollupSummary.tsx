"use client";

type Child = {
  id: string;
  title: string;
  status?: string;
  currentValue?: number | null;
  targetValue?: number | null;
  unit?: string | null;
};

export function GoalRollupSummary({
  supportingGoals,
  parentUnit,
  parentCurrent,
  parentTarget,
}: {
  supportingGoals: Child[];
  parentUnit?: string | null;
  parentCurrent?: number | null;
  parentTarget?: number | null;
}) {
  if (supportingGoals.length === 0) return null;

  const done = supportingGoals.filter((c) => c.status === "COMPLETED").length;
  const total = supportingGoals.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-background px-3 py-2 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
        Progress from supporting goals
      </p>
      <p className="mt-1 text-[var(--text)]">
        {done} of {total} supporting goals completed ({pct}%)
      </p>
      <p className="mt-1 text-xs text-secondary">
        Parent completion requires every supporting goal to be completed.
        Mixed units are never added together
        {parentUnit ? ` · parent shows ${parentCurrent ?? 0}/${parentTarget ?? 100} ${parentUnit}` : ""}.
      </p>
    </div>
  );
}
