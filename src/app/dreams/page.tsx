"use client";

import { UserButton } from "@clerk/nextjs";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageMoodHeader } from "@/components/ui/PageMoodHeader";
import { StatStrip } from "@/components/ui/StatStrip";

type Dream = {
  id: string;
  kind: string;
  title: string | null;
  content: string;
  date: string;
  timeOfDay?: string | null;
  createdAt: string;
  feelings?: string | null;
  meaning?: string | null;
};

function todayInput() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

function fmtWritten(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function DreamsPage() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("NIGHT_DREAM");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dreamDate, setDreamDate] = useState(todayInput());
  const [timeOfDay, setTimeOfDay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/dreams");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load dreams.");
      setDreams(data.dreams ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load dreams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim() || null,
          content,
          date: dreamDate || undefined,
          timeOfDay: timeOfDay || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      setTitle("");
      setContent("");
      setTimeOfDay("");
      setDreamDate(todayInput());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  const day = useMemo(
    () => dreams.filter((d) => d.kind === "DAY_INTENTION"),
    [dreams],
  );
  const night = useMemo(
    () => dreams.filter((d) => d.kind === "NIGHT_DREAM"),
    [dreams],
  );

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="habits">
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <PageMoodHeader
            accent="indigo"
            eyebrow="My Journal"
            title="Dreams"
            description="Day intentions and night dreams — dated so you can track patterns over time."
          />

          <StatStrip
            items={[
              { label: "Day intentions", value: day.length, tone: "indigo" },
              { label: "Night dreams", value: night.length, tone: "gold" },
              { label: "Total", value: dreams.length },
            ]}
          />

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}

          {/* Form stays compact at top; list grows full width below */}
          <form onSubmit={onSubmit} className="card mx-auto max-w-2xl space-y-3 p-5 lg:mx-0 lg:max-w-xl">
              <label className="block text-sm font-medium">
                Kind
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="input-field mt-1.5 w-full"
                >
                  <option value="DAY_INTENTION">Day intention</option>
                  <option value="NIGHT_DREAM">Night dream</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Title (optional)
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field mt-1.5 w-full"
                  placeholder="Short label"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  When dreamed / intended
                  <input
                    type="date"
                    required
                    value={dreamDate}
                    onChange={(e) => setDreamDate(e.target.value)}
                    className="input-field mt-1.5 w-full"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Time (optional)
                  <input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    className="input-field mt-1.5 w-full"
                  />
                </label>
              </div>
              <p className="text-xs text-muted">
                Written time is saved automatically when you press Save.
              </p>
              <label className="block text-sm font-medium">
                What did you dream or intend?
                <textarea
                  required
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input-field mt-1.5 w-full"
                />
              </label>
              <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </form>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text)]">Your log</h2>
                <span className="text-xs text-secondary">{dreams.length} saved</span>
              </div>
            {loading ? (
              <p className="text-sm text-secondary">Loading…</p>
            ) : dreams.length === 0 ? (
              <div className="card p-8 text-center text-sm text-secondary">
                Capture a day intention or a night dream when you are ready.
              </div>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {dreams.map((d) => {
                  const open = expandedId === d.id;
                  const label = d.title?.trim() || "Untitled";
                  const dreamedLabel = [
                    fmtDate(d.date),
                    d.timeOfDay ? `at ${d.timeOfDay}` : null,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <li key={d.id} className="card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-secondary">
                            {String(d.kind).replaceAll("_", " ")}
                          </p>
                          <p className="mt-0.5 font-semibold text-[var(--text)]">
                            {label}
                          </p>
                          <p className="mt-1 text-xs text-secondary">
                            Dreamed {dreamedLabel}
                            <span className="text-muted">
                              {" "}
                              · written {fmtWritten(d.createdAt)}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(open ? null : d.id)}
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {open ? (
                            <>
                              <ChevronUp size={14} /> See less
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} /> See more
                            </>
                          )}
                        </button>
                      </div>
                      {open && (
                        <p className="mt-3 whitespace-pre-wrap border-t border-[var(--border)] pt-3 text-sm leading-relaxed text-secondary">
                          {d.content}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            </section>
        </main>
      </MoodCanvas>
    </AppShell>
  );
}
