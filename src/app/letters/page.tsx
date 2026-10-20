"use client";

import { UserButton } from "@clerk/nextjs";
import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageMoodHeader } from "@/components/ui/PageMoodHeader";
import { StatStrip } from "@/components/ui/StatStrip";

type Letter = {
  id: string;
  recipient: string;
  title: string | null;
  content: string | null;
  isSealed?: boolean;
  openDate?: string | null;
  visibility?: string;
  createdAt: string;
  isReadable?: boolean;
  sealedUntil?: string | null;
};

function fmtWhen(iso: string) {
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

export default function LettersPage() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        body: JSON.stringify({
          recipient: recipient.trim(),
          title: subject.trim() || null,
          content: body,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save letter.");
      setRecipient("");
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
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
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
            <label className="block text-sm font-medium">
              To (recipient)
              <input
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. My wife, Future self, Partner…"
                className="input-field mt-1.5 w-full"
              />
            </label>
            <label className="block text-sm font-medium">
              Title
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject of this letter"
                className="input-field mt-1.5 w-full"
              />
            </label>
            <label className="block text-sm font-medium">
              Letter
              <textarea
                required
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="input-field mt-1.5 w-full"
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
              {letters.map((l) => {
                const open = expandedId === l.id;
                const title = l.title?.trim() || "Untitled letter";
                const canRead = l.isReadable !== false && l.content;
                return (
                  <li
                    key={l.id}
                    className="card border-[var(--achievement)]/20 bg-[#FFFBEB] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {l.isSealed && (
                            <span className="badge badge-gold">Sealed</span>
                          )}
                          <span className="text-xs text-muted">
                            Written {fmtWhen(l.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-base font-semibold text-[var(--text)]">
                          {title}
                        </p>
                        <p className="text-xs text-secondary">
                          To: <span className="font-medium">{l.recipient}</span>
                        </p>
                      </div>
                      {canRead ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(open ? null : l.id)
                          }
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {open ? (
                            <>
                              <ChevronUp size={14} /> See less
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} /> Read letter
                            </>
                          )}
                        </button>
                      ) : (
                        <p className="text-xs text-secondary">
                          {l.sealedUntil
                            ? `Opens ${new Date(l.sealedUntil).toLocaleDateString()}`
                            : "Sealed"}
                        </p>
                      )}
                    </div>
                    {open && canRead && (
                      <div className="mt-3 border-t border-[var(--border)] pt-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                          {l.content}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </MoodCanvas>
    </AppShell>
  );
}
