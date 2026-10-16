"use client";

import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageIntro } from "@/components/ui/PageIntro";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookMarked, Plus, Trash2 } from "lucide-react";

type Lesson = {
  id: string;
  number: number;
  title: string;
  content: string;
  source: string | null;
  tags: string[];
  createdAt: string;
};

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/lessons");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load lessons.");
      setLessons(data.lessons);
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
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          source: source.trim() || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      setLessons((list) => [data.lesson, ...list]);
      setTitle("");
      setContent("");
      setSource("");
      setTags("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/lessons/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Could not delete.");
      setLessons((list) => list.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setPending(null);
    }
  }

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="lessons">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[var(--border)] bg-surface/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <PageIntro
            eyebrow="Wisdom to carry forward"
            title="Life lessons"
            description="Numbered truths you do not want to forget — from experience, failure, books, or faith. Private to you."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <form onSubmit={onCreate} className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            <Plus size={14} className="mr-1 inline" />
            New lesson
          </h2>
          <label className="block text-xs font-medium text-secondary">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field mt-1"
              required
              placeholder="What did you learn?"
            />
          </label>
          <label className="block text-xs font-medium text-secondary">
            Lesson
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="input-field mt-1"
              required
              placeholder="Write it so future-you understands…"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-secondary">
              Source (optional)
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="input-field mt-1"
                placeholder="Experience, book, failure…"
              />
            </label>
            <label className="block text-xs font-medium text-secondary">
              Tags (comma-separated)
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="input-field mt-1"
                placeholder="marriage, money, faith"
              />
            </label>
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save lesson"}
          </button>
        </form>

        {loading ? (
          <p
            role="status"
            className="rounded-xl border border-[var(--border)] bg-surface/90 px-4 py-3 text-sm font-medium text-[var(--text)] shadow-sm"
          >
            Loading lessons…
          </p>
        ) : lessons.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <BookMarked className="mb-3 text-primary" size={28} />
            <p className="text-sm text-secondary">
              No lessons yet. Capture the next hard-won insight.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li key={l.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setExpanded((id) => (id === l.id ? null : l.id))
                    }
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Lesson #{String(l.number).padStart(3, "0")}
                    </p>
                    <p className="mt-1 font-semibold text-[var(--text)]">
                      {l.title}
                    </p>
                    {l.source && (
                      <p className="mt-1 text-xs text-secondary">
                        Source: {l.source}
                      </p>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={pending === l.id}
                    onClick={() => void remove(l.id)}
                    className="text-secondary hover:text-red-600"
                    aria-label="Delete lesson"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {expanded === l.id && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                      {l.content}
                    </p>
                    {l.tags?.length > 0 && (
                      <p className="mt-3 text-xs text-secondary">
                        {l.tags.join(" · ")}
                      </p>
                    )}
                  </div>
                )}
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
