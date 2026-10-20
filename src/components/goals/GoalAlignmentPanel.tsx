"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Pencil } from "lucide-react";

const OPTIONS = [
  { value: "NONE", label: "Not linked to foundation" },
  { value: "VISION", label: "Serves my vision" },
  { value: "MISSION", label: "Serves my mission" },
  { value: "VISION_AND_MISSION", label: "Serves vision and mission" },
] as const;

function labelFor(value: string) {
  return OPTIONS.find((o) => o.value === value)?.label ?? value;
}

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
  const [editing, setEditing] = useState(
    !alignment || alignment === "NONE",
  );

  useEffect(() => {
    setValue(alignment || "NONE");
    setNote(alignmentNote || "");
    setEditing(!alignment || alignment === "NONE");
  }, [alignment, alignmentNote, goalId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alignment: value,
          alignmentNote: note.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to save alignment.");
      setEditing(false);
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
    <section className="rounded-2xl border border-[var(--border)] bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Compass className="mt-0.5 text-primary" size={18} aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Vision &amp; mission alignment
            </h2>
            <p className="mt-1 text-xs text-secondary">
              Explicit link to foundation — not inferred from life area alone.
            </p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text)]">
            {labelFor(value)}
          </p>
          {note.trim() ? (
            <p className="text-sm leading-relaxed text-secondary whitespace-pre-wrap">
              {note}
            </p>
          ) : (
            <p className="text-sm text-muted">No contribution note yet.</p>
          )}
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
        </div>
      ) : (
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
              placeholder="Why this goal exists relative to who you are becoming…"
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

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save alignment"}
            </button>
            {alignment && alignment !== "NONE" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setValue(alignment || "NONE");
                  setNote(alignmentNote || "");
                  setEditing(false);
                  setError(null);
                }}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
