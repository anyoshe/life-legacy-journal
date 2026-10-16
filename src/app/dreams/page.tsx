"use client";

import { UserButton } from "@clerk/nextjs";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageMoodHeader } from "@/components/ui/PageMoodHeader";
import { StatStrip } from "@/components/ui/StatStrip";

type Dream = {
  id: string;
  kind: string;
  title: string | null;
  content: string;
  date?: string;
};

export default function DreamsPage() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("DAY_INTENTION");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        body: JSON.stringify({ kind, title: title || undefined, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      setTitle("");
      setContent("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  const day = dreams.filter((d) => String(d.kind).includes("DAY"));
  const night = dreams.filter((d) => String(d.kind).includes("NIGHT"));

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="dreams">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageMoodHeader
          accent="sky"
          eyebrow="My Journal"
          title="Dreams"
          description="Day intentions and night dreams that shape who you become."
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <form onSubmit={onSubmit} className="card space-y-3 p-5">
          <label className="text-sm font-medium">
            Kind
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="input-field mt-1.5">
              <option value="DAY_INTENTION">Day intention</option>
              <option value="NIGHT_DREAM">Night dream</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Title (optional)
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field mt-1.5" />
          </label>
          <label className="text-sm font-medium">
            What did you dream or intend?
            <textarea required rows={4} value={content} onChange={(e) => setContent(e.target.value)} className="input-field mt-1.5" />
          </label>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : dreams.length === 0 ? (
          <div className="card p-8 text-center text-sm text-secondary">
            Capture a day intention or a night dream when you are ready.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {dreams.map((d) => (
              <li key={d.id} className="card card-tint-indigo p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                  {String(d.kind).replaceAll("_", " ")}
                </p>
                <p className="mt-1 font-medium text-[var(--text)]">{d.title || "Untitled"}</p>
                <p className="mt-1 line-clamp-3 text-sm text-secondary">{d.content}</p>
              </li>
            ))}
          </ul>
        )}
        </div>
      </main>
      </MoodCanvas>
    </AppShell>
  );
}
