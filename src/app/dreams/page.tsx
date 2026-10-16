"use client";

import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Moon, Sun, Trash2 } from "lucide-react";

type Dream = {
  id: string;
  kind: "DAY_INTENTION" | "NIGHT_DREAM";
  title: string | null;
  content: string;
  date: string;
  feelings: string | null;
  meaning: string | null;
  createdAt: string;
};

export default function DreamsPage() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [filter, setFilter] = useState<"ALL" | "DAY_INTENTION" | "NIGHT_DREAM">(
    "ALL",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"DAY_INTENTION" | "NIGHT_DREAM">(
    "DAY_INTENTION",
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [feelings, setFeelings] = useState("");
  const [meaning, setMeaning] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(kindFilter = filter) {
    setLoading(true);
    try {
      const q =
        kindFilter === "ALL" ? "" : `?kind=${encodeURIComponent(kindFilter)}`;
      const res = await fetch(`/api/dreams${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load dreams.");
      setDreams(data.dreams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dreams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function createDream(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim() || null,
          content: content.trim(),
          feelings: feelings.trim() || null,
          meaning: meaning.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save dream.");
      setDreams((list) => [data.dream, ...list]);
      setTitle("");
      setContent("");
      setFeelings("");
      setMeaning("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save dream.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/dreams/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete.");
      }
      setDreams((list) => list.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  return (
    <AppShell rightSlot={<UserButton />}>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 pb-8">
        <PageIntro
          eyebrow="My Journal"
          title="Dreams"
          description="Day intentions and night dreams that shape you."
        />

<div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Dreams</h1>
          <p className="mt-1 text-sm leading-6 text-secondary">
            <strong className="text-[var(--text)]">Day intentions</strong> —
            what you dream for your life and today.{" "}
            <strong className="text-[var(--text)]">Night dreams</strong> — what
            comes while you sleep. Both shape who you become.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form
          onSubmit={createDream}
          className="space-y-3 rounded-2xl border border-[var(--border)] bg-surface p-5"
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setKind("DAY_INTENTION")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                kind === "DAY_INTENTION"
                  ? "border-primary bg-private text-primary"
                  : "border-[var(--border)] text-secondary"
              }`}
            >
              <Sun size={16} /> Day intention
            </button>
            <button
              type="button"
              onClick={() => setKind("NIGHT_DREAM")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                kind === "NIGHT_DREAM"
                  ? "border-primary bg-private text-primary"
                  : "border-[var(--border)] text-secondary"
              }`}
            >
              <Moon size={16} /> Night dream
            </button>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
          />
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder={
              kind === "DAY_INTENTION"
                ? "What do you dream for today, this season, or your life?"
                : "What did you dream last night?"
            }
            className="w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm leading-6"
          />
          <input
            value={feelings}
            onChange={(e) => setFeelings(e.target.value)}
            placeholder="Feelings (optional)"
            className="w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={2}
            placeholder="What might this mean for you? (optional)"
            className="w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save dream"}
          </button>
        </form>

        <div className="flex gap-2 text-sm">
          {(
            [
              ["ALL", "All"],
              ["DAY_INTENTION", "Day"],
              ["NIGHT_DREAM", "Night"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1 ${
                filter === value
                  ? "bg-primary text-white"
                  : "bg-surface text-secondary border border-[var(--border)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : dreams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center text-sm text-secondary">
            No dreams recorded yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {dreams.map((d) => (
              <li
                key={d.id}
                className="rounded-2xl border border-[var(--border)] bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    {d.kind === "DAY_INTENTION" ? (
                      <Sun size={14} />
                    ) : (
                      <Moon size={14} />
                    )}
                    {d.kind === "DAY_INTENTION" ? "Day intention" : "Night dream"}
                    <span className="text-secondary">
                      · {new Date(d.date).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(d.id)}
                    className="text-secondary hover:text-red-600"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {d.title && (
                  <h2 className="mt-2 font-semibold text-[var(--text)]">
                    {d.title}
                  </h2>
                )}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
                  {d.content}
                </p>
                {d.feelings && (
                  <p className="mt-2 text-xs text-secondary">
                    Feelings: {d.feelings}
                  </p>
                )}
                {d.meaning && (
                  <p className="mt-1 text-xs text-secondary">
                    Meaning: {d.meaning}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
