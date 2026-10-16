"use client";

import { UserButton } from "@clerk/nextjs";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageMoodHeader } from "@/components/ui/PageMoodHeader";
import { StatStrip } from "@/components/ui/StatStrip";

type Letter = {
  id: string;
  subject: string | null;
  body?: string | null;
  isSealed?: boolean;
  openDate?: string | null;
  visibility?: string;
  createdAt: string;
};

export default function LettersPage() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/letters");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load letters.");
      setLetters(data.letters ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load letters.");
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
      const res = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save letter.");
      setSubject("");
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  const sealed = letters.filter((l) => l.isSealed).length;

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="letters">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <PageMoodHeader
          accent="parchment"
          eyebrow="My Journal"
          title="Letters"
          description="Words for those you love — sealed when you choose."
        />

        <StatStrip
          items={[
            { label: "Letters", value: letters.length, tone: "gold" },
            { label: "Sealed", value: sealed },
          ]}
        />

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="card space-y-3 p-5">
          <label className="text-sm font-medium">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field mt-1.5"
            />
          </label>
          <label className="text-sm font-medium">
            Letter
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input-field mt-1.5"
            />
          </label>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? "Saving…" : "Save letter"}
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : letters.length === 0 ? (
          <div className="card p-8 text-center text-sm text-secondary">
            Write a letter when the words are ready.
          </div>
        ) : (
          <ul className="space-y-3">
            {letters.map((l) => (
              <li key={l.id} className="card border-[var(--achievement)]/20 bg-[#FFFBEB] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {l.isSealed && (
                    <span className="badge badge-gold">Sealed</span>
                  )}
                  <span className="text-xs text-muted">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 font-medium text-[var(--text)]">
                  {l.subject || "Untitled letter"}
                </p>
                {l.isSealed && l.openDate ? (
                  <p className="mt-1 text-sm text-secondary">
                    Opens {new Date(l.openDate).toLocaleDateString()}
                  </p>
                ) : l.body ? (
                  <p className="mt-1 line-clamp-3 text-sm text-secondary">{l.body}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
      </MoodCanvas>
    </AppShell>
  );
}
