"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Mail, Plus, Trash2 } from "lucide-react";

type Letter = {
  id: string;
  recipient: string;
  title: string | null;
  content: string | null;
  isSealed: boolean;
  openDate: string | null;
  visibility: string;
  createdAt: string;
  isMine: boolean;
  isReadable: boolean;
  sealedUntil: string | null;
};

const RECIPIENTS = [
  { value: "wife", label: "Wife / partner" },
  { value: "partner", label: "Partner" },
  { value: "children", label: "Children" },
  { value: "future-self", label: "Future self" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
];

export default function LettersPage() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("wife");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "SHARED_WITH_PARTNER">(
    "PRIVATE",
  );
  const [isSealed, setIsSealed] = useState(false);
  const [openDate, setOpenDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/letters");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load letters.");
      setLetters(data.letters);
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
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          title: title.trim() || null,
          content: content.trim(),
          visibility,
          isSealed,
          openDate: isSealed && openDate ? openDate : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      setTitle("");
      setContent("");
      setIsSealed(false);
      setOpenDate("");
      setVisibility("PRIVATE");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/letters/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Could not delete.");
      setLetters((list) => list.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="page-wash min-h-screen pb-nav">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="text-sm font-medium text-[var(--text)]">Letters</span>
          <Link href="/lessons" className="text-sm text-primary">
            Lessons
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div>
          <p className="eyebrow mb-2">Legacy · Marriage</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Letters
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Write to your wife, children, or future self. Keep private, share
            with your partner, or seal until a chosen date.
          </p>
        </div>

        <form onSubmit={onCreate} className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            <Plus size={14} className="mr-1 inline" />
            New letter
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-secondary">
              To
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="input-field mt-1"
              >
                {RECIPIENTS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-secondary">
              Visibility
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(
                    e.target.value as "PRIVATE" | "SHARED_WITH_PARTNER",
                  )
                }
                className="input-field mt-1"
              >
                <option value="PRIVATE">Private (only you)</option>
                <option value="SHARED_WITH_PARTNER">Shared with partner</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-medium text-secondary">
            Title (optional)
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field mt-1"
              placeholder="A letter for…"
            />
          </label>
          <label className="block text-xs font-medium text-secondary">
            Letter
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="input-field mt-1"
              required
              placeholder="Write from the heart…"
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={isSealed}
                onChange={(e) => setIsSealed(e.target.checked)}
              />
              Seal until date
            </label>
            {isSealed && (
              <input
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                className="input-field w-auto"
              />
            )}
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save letter"}
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : letters.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <Mail className="mb-3 text-primary" size={28} />
            <p className="text-sm text-secondary">
              No letters yet. Write one your future family will treasure.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {letters.map((l) => (
              <li key={l.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setExpanded((id) => (id === l.id ? null : l.id))
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-indigo">
                        To: {l.recipient}
                      </span>
                      {l.visibility === "SHARED_WITH_PARTNER" && (
                        <span className="badge badge-rose">Shared</span>
                      )}
                      {l.isSealed && (
                        <span className="badge badge-gold">
                          <Lock size={10} className="mr-0.5" /> Sealed
                        </span>
                      )}
                      {!l.isMine && (
                        <span className="text-xs text-secondary">From partner</span>
                      )}
                    </div>
                    <p className="mt-2 font-semibold text-[var(--text)]">
                      {l.title || "Untitled letter"}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      {new Date(l.createdAt).toLocaleDateString()}
                      {l.sealedUntil
                        ? ` · opens ${new Date(l.sealedUntil).toLocaleDateString()}`
                        : ""}
                    </p>
                  </button>
                  {l.isMine && (
                    <button
                      type="button"
                      disabled={pending === l.id}
                      onClick={() => void remove(l.id)}
                      className="text-secondary hover:text-red-600"
                      aria-label="Delete letter"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {expanded === l.id && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    {l.isReadable && l.content ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                        {l.content}
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-secondary">
                        <Lock size={14} />
                        Sealed until{" "}
                        {l.sealedUntil
                          ? new Date(l.sealedUntil).toLocaleDateString()
                          : "the open date"}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
