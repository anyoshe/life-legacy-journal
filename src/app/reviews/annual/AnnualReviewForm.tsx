"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Fields = {
  wins: string;
  challenges: string;
  lessons: string;
  relationships: string;
  growth: string;
  gratitude: string;
  nextYearFocus: string;
  legacyNote: string;
};

export function AnnualReviewForm({
  year,
  periodStart,
  periodEnd,
  initial,
}: {
  year: number;
  periodStart: string;
  periodEnd: string;
  initial: Fields;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set(key: keyof Fields, value: string) {
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
          type: "ANNUAL",
          periodStart,
          periodEnd,
          content: form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof Fields; label: string; rows?: number }[] = [
    { key: "wins", label: `What went well in ${year}?`, rows: 4 },
    { key: "challenges", label: "What was hard?", rows: 3 },
    { key: "lessons", label: "What did you learn about yourself?", rows: 3 },
    { key: "relationships", label: "How did key relationships grow?", rows: 3 },
    { key: "growth", label: "Where did you grow spiritually, financially, or personally?", rows: 3 },
    { key: "gratitude", label: "What are you most grateful for?", rows: 3 },
    { key: "nextYearFocus", label: `Focus for ${year + 1}`, rows: 3 },
    { key: "legacyNote", label: "What do you want remembered from this year?", rows: 3 },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {fields.map((f) => (
        <label key={f.key} className="block text-sm font-medium text-[var(--text)]">
          {f.label}
          <textarea
            value={form[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
            rows={f.rows ?? 3}
            className="input-field mt-1.5"
          />
        </label>
      ))}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm text-[var(--secondary)]">Saved annual review.</p>
      )}
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save annual review"}
      </button>
    </form>
  );
}
