"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  LockKeyhole,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

type Entry = {
  id: string;
  userId: string;
  type: string;
  visibility: "PRIVATE" | "SHARED_WITH_PARTNER";
  title: string | null;
  content: string;
  mood: string | null;
  energy: number | null;
  tags: string[];
  gratitudeItems: string[];
  accomplishments: string[];
  spiritualNote: string | null;
  marriageNote: string | null;
  financialNote: string | null;
  lessonOfDay: string | null;
  tomorrowPriority: string | null;
  prayer: string | null;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function EntryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const entryId = params.id;

  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "SHARED_WITH_PARTNER">("PRIVATE");
  const [mood, setMood] = useState("");
  const [lessonOfDay, setLessonOfDay] = useState("");
  const [tomorrowPriority, setTomorrowPriority] = useState("");
  const [spiritualNote, setSpiritualNote] = useState("");
  const [marriageNote, setMarriageNote] = useState("");
  const [financialNote, setFinancialNote] = useState("");
  const [prayer, setPrayer] = useState("");
  const [gratitudeText, setGratitudeText] = useState("");
  const [accomplishmentsText, setAccomplishmentsText] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/entries/${entryId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Entry not found.");
        const e = data.entry as Entry;
        setEntry(e);
        setContent(e.content);
        setTitle(e.title ?? "");
        setVisibility(e.visibility);
        setMood(e.mood ?? "");
        setLessonOfDay(e.lessonOfDay ?? "");
        setTomorrowPriority(e.tomorrowPriority ?? "");
        setSpiritualNote(e.spiritualNote ?? "");
        setMarriageNote(e.marriageNote ?? "");
        setFinancialNote(e.financialNote ?? "");
        setPrayer(e.prayer ?? "");
        setGratitudeText((e.gratitudeItems ?? []).join("\n"));
        setAccomplishmentsText((e.accomplishments ?? []).join("\n"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load entry.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [entryId]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!entry?.isOwner) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          title: title || null,
          visibility,
          mood: mood || null,
          lessonOfDay: lessonOfDay || null,
          tomorrowPriority: tomorrowPriority || null,
          spiritualNote: spiritualNote || null,
          marriageNote: marriageNote || null,
          financialNote: financialNote || null,
          prayer: prayer || null,
          gratitudeItems: gratitudeText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          accomplishments: accomplishmentsText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save changes.");
      setEntry(data.entry);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry?.isOwner) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete entry.");
      }
      router.push("/entries");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete entry.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-secondary">
        Loading entry…
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-[var(--text)]">{error || "Entry not found."}</p>
        <Link href="/entries" className="mt-4 inline-block text-sm text-primary">
          Back to journal
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link
            href="/entries"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Journal
          </Link>
          <span className="text-sm font-medium text-[var(--text)]">Entry</span>
          {entry.isOwner ? (
            <div className="flex items-center gap-2">
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm text-secondary hover:text-primary"
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm text-secondary"
                >
                  <X size={14} /> Cancel
                </button>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted">Read only</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!editing ? (
          <article
            className={`rounded-2xl border p-6 ${
              entry.visibility === "PRIVATE" ? "bg-private" : "bg-shared"
            } border-[var(--border)]`}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
              <span>{formatDateTime(entry.createdAt)}</span>
              {entry.updatedAt !== entry.createdAt && (
                <>
                  <span>·</span>
                  <span>Updated {formatDateTime(entry.updatedAt)}</span>
                </>
              )}
              <span>·</span>
              <span className="uppercase tracking-wide">
                {entry.type.replaceAll("_", " ")}
              </span>
              <span>·</span>
              {entry.visibility === "PRIVATE" ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <LockKeyhole size={12} /> Private
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[var(--area-marriage)]">
                  <Heart size={12} /> Shared with partner
                </span>
              )}
            </div>

            {entry.title && (
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text)]">
                {entry.title}
              </h1>
            )}

            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--text)]">
              {entry.content}
            </p>

            {entry.gratitudeItems?.length > 0 && (
              <section className="mt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  Grateful for
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
                  {entry.gratitudeItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {entry.accomplishments?.length > 0 && (
              <section className="mt-5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  Accomplishments
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
                  {entry.accomplishments.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-6 grid gap-4 text-sm">
              {entry.spiritualNote && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Spiritual
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--text)]">{entry.spiritualNote}</p>
                </div>
              )}
              {entry.marriageNote && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Marriage
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--text)]">{entry.marriageNote}</p>
                </div>
              )}
              {entry.financialNote && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Financial / career
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--text)]">{entry.financialNote}</p>
                </div>
              )}
              {entry.lessonOfDay && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Lesson
                  </p>
                  <p className="mt-1 text-[var(--text)]">{entry.lessonOfDay}</p>
                </div>
              )}
              {entry.prayer && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Prayer
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--text)]">{entry.prayer}</p>
                </div>
              )}
              {entry.tomorrowPriority && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Tomorrow&apos;s priority
                  </p>
                  <p className="mt-1 text-[var(--text)]">{entry.tomorrowPriority}</p>
                </div>
              )}
              {entry.mood && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Mood</p>
                  <p className="mt-1 text-[var(--text)]">{entry.mood}</p>
                </div>
              )}
            </div>

            {entry.isOwner && (
              <div className="mt-8 border-t border-[var(--border)] pt-6">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} /> Delete entry
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-800">
                      Delete this entry permanently? This cannot be undone.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => void handleDelete()}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {deleting ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-lg px-3 py-1.5 text-sm text-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        ) : (
          <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-[var(--border)] bg-surface p-6">
            <div>
              <label className="text-sm font-medium text-[var(--text)]">Visibility</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("PRIVATE")}
                  className={`rounded-xl border p-3 text-left text-sm ${
                    visibility === "PRIVATE"
                      ? "bg-private border-primary/40"
                      : "border-[var(--border)]"
                  }`}
                >
                  🔒 Private
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("SHARED_WITH_PARTNER")}
                  className={`rounded-xl border p-3 text-left text-sm ${
                    visibility === "SHARED_WITH_PARTNER"
                      ? "bg-shared border-[var(--area-marriage)]/40"
                      : "border-[var(--border)]"
                  }`}
                >
                  💛 Shared
                </button>
              </div>
            </div>

            <label className="block text-sm font-medium text-[var(--text)]">
              Title (optional)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Content
              <textarea
                required
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Grateful for (one per line)
              <textarea
                rows={3}
                value={gratitudeText}
                onChange={(e) => setGratitudeText(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Accomplishments (one per line)
              <textarea
                rows={2}
                value={accomplishmentsText}
                onChange={(e) => setAccomplishmentsText(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Spiritual
              <textarea
                rows={2}
                value={spiritualNote}
                onChange={(e) => setSpiritualNote(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Marriage
              <textarea
                rows={2}
                value={marriageNote}
                onChange={(e) => setMarriageNote(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Financial / career
              <textarea
                rows={2}
                value={financialNote}
                onChange={(e) => setFinancialNote(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Lesson
              <input
                value={lessonOfDay}
                onChange={(e) => setLessonOfDay(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Prayer
              <textarea
                rows={2}
                value={prayer}
                onChange={(e) => setPrayer(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[var(--text)]">
                Tomorrow&apos;s priority
                <input
                  value={tomorrowPriority}
                  onChange={(e) => setTomorrowPriority(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text)]">
                Mood
                <input
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg px-4 py-2 text-sm text-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !content.trim()}
                className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
