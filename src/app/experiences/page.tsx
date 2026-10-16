"use client";

import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Plus, Trash2 } from "lucide-react";

type Experience = {
  id: string;
  title: string;
  whatHappened: string;
  date: string;
  location: string | null;
  peopleInvolved: string[];
  feelings: string | null;
  outcome: string | null;
  lesson: string | null;
  wouldDoDifferently: string | null;
  remember: string | null;
  tags: string[];
};

export default function ExperiencesPage() {
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [people, setPeople] = useState("");
  const [feelings, setFeelings] = useState("");
  const [outcome, setOutcome] = useState("");
  const [lesson, setLesson] = useState("");
  const [wouldDoDifferently, setWouldDoDifferently] = useState("");
  const [remember, setRemember] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/experiences");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setItems(data.experiences);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          whatHappened: whatHappened.trim(),
          date,
          location: location.trim() || null,
          peopleInvolved: people
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          feelings: feelings.trim() || null,
          outcome: outcome.trim() || null,
          lesson: lesson.trim() || null,
          wouldDoDifferently: wouldDoDifferently.trim() || null,
          remember: remember.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      setItems((list) => [data.experience, ...list]);
      setTitle("");
      setWhatHappened("");
      setLocation("");
      setPeople("");
      setFeelings("");
      setOutcome("");
      setLesson("");
      setWouldDoDifferently("");
      setRemember("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/experiences/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Could not delete.");
      setItems((list) => list.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setPending(null);
    }
  }

  return (
    <AppShell rightSlot={<UserButton />}>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 pb-8">
        <PageIntro
          eyebrow="My Journal"
          title="Experiences"
          description="Moments that shaped you."
        />

<div>
          <p className="eyebrow mb-2">Legacy</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Experiences
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Moments that shaped you — what happened, what you felt, what you
            want to remember.
          </p>
        </div>

        <form onSubmit={onCreate} className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold">
            <Plus size={14} className="mr-1 inline" />
            Record an experience
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-secondary sm:col-span-2">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field mt-1"
                required
              />
            </label>
            <label className="block text-xs font-medium text-secondary">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field mt-1"
              />
            </label>
            <label className="block text-xs font-medium text-secondary">
              Location
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-field mt-1"
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-secondary">
            What happened
            <textarea
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              rows={4}
              className="input-field mt-1"
              required
            />
          </label>
          <label className="block text-xs font-medium text-secondary">
            People involved (comma-separated)
            <input
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              className="input-field mt-1"
            />
          </label>
          <label className="block text-xs font-medium text-secondary">
            Feelings
            <input
              value={feelings}
              onChange={(e) => setFeelings(e.target.value)}
              className="input-field mt-1"
            />
          </label>
          <label className="block text-xs font-medium text-secondary">
            Outcome
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={2}
              className="input-field mt-1"
            />
          </label>
          <label className="block text-xs font-medium text-secondary">
            Lesson
            <textarea
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              rows={2}
              className="input-field mt-1"
            />
          </label>
          <label className="block text-xs font-medium text-secondary">
            Would do differently
            <textarea
              value={wouldDoDifferently}
              onChange={(e) => setWouldDoDifferently(e.target.value)}
              rows={2}
              className="input-field mt-1"
            />
          </label>
          <label className="block text-xs font-medium text-secondary">
            Remember this
            <textarea
              value={remember}
              onChange={(e) => setRemember(e.target.value)}
              rows={2}
              className="input-field mt-1"
            />
          </label>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save experience"}
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : items.length === 0 ? (
          <div className="card px-6 py-12 text-center text-sm text-secondary">
            No experiences recorded yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((ex) => (
              <li key={ex.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setExpanded((id) => (id === ex.id ? null : ex.id))
                    }
                  >
                    <p className="font-semibold text-[var(--text)]">{ex.title}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {new Date(ex.date).toLocaleDateString()}
                      {ex.location ? (
                        <>
                          {" "}
                          · <MapPin size={10} className="inline" /> {ex.location}
                        </>
                      ) : null}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={pending === ex.id}
                    onClick={() => void remove(ex.id)}
                    className="text-secondary hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {expanded === ex.id && (
                  <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 text-sm">
                    <p className="whitespace-pre-wrap text-[var(--text)]">
                      {ex.whatHappened}
                    </p>
                    {ex.feelings && (
                      <p className="text-secondary">Feelings: {ex.feelings}</p>
                    )}
                    {ex.outcome && (
                      <p className="text-secondary">Outcome: {ex.outcome}</p>
                    )}
                    {ex.lesson && (
                      <p className="text-secondary">Lesson: {ex.lesson}</p>
                    )}
                    {ex.remember && (
                      <p className="font-medium text-primary">
                        Remember: {ex.remember}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
