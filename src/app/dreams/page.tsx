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


          {/* Top: form + day intentions side by side; night dreams full width below */}
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <form onSubmit={onSubmit} className="card space-y-3 p-5">
              <h2 className="text-sm font-semibold text-[var(--text)]">Capture</h2>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  When dreamed / intended
                  <input
                    type="date"
                    value={dreamDate}
                    onChange={(e) => setDreamDate(e.target.value)}
                    className="input-field mt-1.5 w-full"
                    required
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
              <label className="block text-sm font-medium">
                Content
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  required
                  className="input-field mt-1.5 w-full"
                  placeholder={
                    kind === "DAY_INTENTION"
                      ? "What I intend to live today…"
                      : "What I dreamed…"
                  }
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </form>

            {/* Day intentions — left/right of form on large screens */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  Day intentions
                </h2>
                <span className="text-xs text-secondary">{day.length}</span>
              </div>
              {loading ? (
                <p className="text-sm text-secondary">Loading…</p>
              ) : day.length === 0 ? (
                <div className="card border-dashed p-6 text-center text-sm text-secondary">
                  Day intentions will appear here — set kind to Day intention
                  and save.
                </div>
              ) : (
                <ul
                  className={
                    day.length <= 2
                      ? "space-y-3"
                      : "grid gap-2 sm:grid-cols-1 xl:grid-cols-2"
                  }
                >
                  {day.map((d) => {
                    const open = expandedId === d.id;
                    const few = day.length <= 2;
                    const showBody = few || open;
                    const label = d.title?.trim() || "Day intention";
                    const dreamedLabel = [
                      fmtDate(d.date),
                      d.timeOfDay ? `at ${d.timeOfDay}` : null,
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <li
                        key={d.id}
                        className={
                          few
                            ? "card border-l-4 border-l-primary p-4 sm:p-5"
                            : "card p-3.5"
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                              Day intention
                            </p>
                            <p className="mt-0.5 font-semibold text-[var(--text)]">
                              {label}
                            </p>
                            <p className="mt-1 text-xs text-secondary">
                              {dreamedLabel}
                              <span className="text-muted">
                                {" "}
                                · written {fmtWritten(d.createdAt)}
                              </span>
                            </p>
                          </div>
                          {!few && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(open ? null : d.id)
                              }
                              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              {open ? (
                                <>
                                  <ChevronUp size={14} /> Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={14} /> More
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        {showBody && (
                          <p
                            className={
                              few
                                ? "mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]"
                                : "mt-2 whitespace-pre-wrap border-t border-[var(--border)] pt-2 text-sm leading-relaxed text-secondary"
                            }
                          >
                            {d.content}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Night dreams — full width tiles below */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                Night dreams
              </h2>
              <span className="text-xs text-secondary">{night.length} saved</span>
            </div>
            {loading ? (
              <p className="text-sm text-secondary">Loading…</p>
            ) : night.length === 0 ? (
              <div className="card p-8 text-center text-sm text-secondary">
                Night dreams will list here as tiles after you save them.
              </div>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {night.map((d) => {
                  const open = expandedId === d.id;
                  const label = d.title?.trim() || "Untitled dream";
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
                            Night dream
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
