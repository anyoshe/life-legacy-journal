"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";

const OPTIONS = [
  { value: "NONE", label: "Not linked to foundation" },
  { value: "VISION", label: "Serves my vision" },
  { value: "MISSION", label: "Serves my mission" },
  { value: "VISION_AND_MISSION", label: "Serves vision and mission" },
];

export function GoalAlignmentPanel({
  goalId,
  alignment,
  alignmentNote,
  vision,
  mission,
}: {
  goalId: string;
  alignment?: string | null;
  alignmentNote?: string | null;
  vision?: string | null;
  mission?: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(alignment || "NONE");
  const [note, setNote] = useState(alignmentNote || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alignment: value,
          alignmentNote: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save alignment.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save alignment.");
    } finally {
      setSaving(false);
    }
  }

  const showVision =
    value === "VISION" || value === "VISION_AND_MISSION";
  const showMission =
    value === "MISSION" || value === "VISION_AND_MISSION";

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[var(--private-bg)] p-2 text-primary">
          <Compass size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Vision &amp; mission link
          </h2>
          <p className="mt-1 text-xs text-secondary">
            Alignment is explicit. Choosing a life area (e.g. Financial) does not
            automatically link this goal to your vision or mission.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-xs font-medium text-secondary">
          This goal
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
          >
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-secondary">
          How it contributes (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="In your words: why this goal exists relative to who you are becoming…"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
          />
        </label>

        {(showVision || showMission) && (
          <div className="space-y-2 rounded-xl border border-[var(--border)] bg-background p-3 text-sm">
            {showVision && (
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  Your vision
                </p>
                <p className="mt-1 text-secondary">
                  {vision?.trim() || (
                    <Link href="/foundation" className="text-primary">
                      Not set yet — write it in Foundation
                    </Link>
                  )}
                </p>
              </div>
            )}
            {showMission && (
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  Your mission
                </p>
                <p className="mt-1 text-secondary">
                  {mission?.trim() || (
                    <Link href="/foundation" className="text-primary">
                      Not set yet — write it in Foundation
                    </Link>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="text-sm text-[var(--secondary-solid,#6B8E7B)]">Saved.</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save alignment"}
        </button>
      </form>
    </section>
  );
}
