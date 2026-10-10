"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Content = {
  wins: string;
  challenges: string;
  lessons: string;
  gratitude: string;
  relationships: string;
  focusNextWeek: string;
  energy: number | null;
  notes: string;
};

export function WeeklyReviewForm({
  periodStart,
  periodEnd,
  initial,
}: {
  periodStart: string;
  periodEnd: string;
  initial: Content;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Content>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setField<K extends keyof Content>(key: K, value: Content[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "WEEKLY",
          periodStart,
          periodEnd,
          content: form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save review.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Review saved.
        </p>
      )}

      <Field
        label="Wins — what moved this week?"
        value={form.wins}
        onChange={(v) => setField("wins", v)}
        rows={3}
      />
      <Field
        label="Challenges — what was hard?"
        value={form.challenges}
        onChange={(v) => setField("challenges", v)}
        rows={3}
      />
      <Field
        label="Lessons — what did I learn?"
        value={form.lessons}
        onChange={(v) => setField("lessons", v)}
        rows={3}
      />
      <Field
        label="Gratitude"
        value={form.gratitude}
        onChange={(v) => setField("gratitude", v)}
        rows={2}
      />
      <Field
        label="Relationships (marriage, family, others)"
        value={form.relationships}
        onChange={(v) => setField("relationships", v)}
        rows={2}
      />
      <Field
        label="Focus for next week"
        value={form.focusNextWeek}
        onChange={(v) => setField("focusNextWeek", v)}
        rows={2}
      />

      <label className="block text-sm font-medium text-[var(--text)]">
        Energy this week (1–10)
        <input
          type="number"
          min={1}
          max={10}
          value={form.energy ?? ""}
          onChange={(e) =>
            setField(
              "energy",
              e.target.value ? Number(e.target.value) : null,
            )
          }
          className="mt-1.5 w-24 rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
        />
      </label>

      <Field
        label="Anything else"
        value={form.notes}
        onChange={(v) => setField("notes", v)}
        rows={2}
      />

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save weekly review"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <label className="block text-sm font-medium text-[var(--text)]">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-surface px-3 py-2 text-sm leading-6 text-[var(--text)]"
      />
    </label>
  );
}
