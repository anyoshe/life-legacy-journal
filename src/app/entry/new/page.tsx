"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

type Visibility = "PRIVATE" | "SHARED_WITH_PARTNER";

export default function NewEntryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [visibility, setVisibility] = useState<Visibility>("PRIVATE");
  const [content, setContent] = useState("");
  const [gratitude1, setGratitude1] = useState("");
  const [gratitude2, setGratitude2] = useState("");
  const [gratitude3, setGratitude3] = useState("");
  const [accomplishment1, setAccomplishment1] = useState("");
  const [accomplishment2, setAccomplishment2] = useState("");
  const [spiritualNote, setSpiritualNote] = useState("");
  const [marriageNote, setMarriageNote] = useState("");
  const [financialNote, setFinancialNote] = useState("");
  const [lessonOfDay, setLessonOfDay] = useState("");
  const [tomorrowPriority, setTomorrowPriority] = useState("");
  const [prayer, setPrayer] = useState("");
  const [mood, setMood] = useState("");
  const [goalId, setGoalId] = useState("");
  const [goals, setGoals] = useState<{ id: string; title: string; area: string }[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");


  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/goals");
        if (!res.ok) return;
        const data = await res.json();
        setGoals(
          (data.goals || []).map((g: { id: string; title: string; area: string }) => ({
            id: g.id,
            title: g.title,
            area: g.area,
          })),
        );
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          visibility,
          gratitudeItems: [gratitude1, gratitude2, gratitude3].filter(Boolean),
          accomplishments: [accomplishment1, accomplishment2].filter(Boolean),
          spiritualNote,
          marriageNote,
          financialNote,
          lessonOfDay,
          tomorrowPriority,
          prayer,
          mood: mood || undefined,
          goalId: goalId || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save entry");
      }

      if (mediaUrl.trim() && data.entry?.id) {
        await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: mediaUrl.trim(),
            type: "image",
            entryId: data.entry.id,
          }),
        });
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Entry saved</h1>
          <p className="text-secondary mt-1">Returning to dashboard…</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-[var(--border)] bg-surface sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/dashboard" className="text-sm text-secondary hover:text-primary transition-colors">
            ← Dashboard
          </a>
          <span className="text-sm font-medium text-[var(--text)]">Daily Entry</span>
          <UserButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
            How was your day?
          </h1>
          <p className="text-secondary mt-1 text-sm">
            A few quiet minutes of reflection. No pressure to fill everything.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Visibility toggle */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-3">
              Who can see this?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility("PRIVATE")}
                className={`rounded-xl border p-4 text-left transition-all ${
                  visibility === "PRIVATE"
                    ? "bg-private border-primary/40 ring-2 ring-primary/20"
                    : "bg-surface border-[var(--border)] hover:border-primary/30"
                }`}
              >
                <div className="text-lg mb-1">🔒</div>
                <div className="font-medium text-sm text-[var(--text)]">Private</div>
                <div className="text-xs text-secondary mt-0.5">Only you</div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("SHARED_WITH_PARTNER")}
                className={`rounded-xl border p-4 text-left transition-all ${
                  visibility === "SHARED_WITH_PARTNER"
                    ? "bg-shared border-[var(--area-marriage)]/40 ring-2 ring-[var(--area-marriage)]/20"
                    : "bg-surface border-[var(--border)] hover:border-[var(--area-marriage)]/30"
                }`}
              >
                <div className="text-lg mb-1">💛</div>
                <div className="font-medium text-sm text-[var(--text)]">Shared</div>
                <div className="text-xs text-secondary mt-0.5">With partner</div>
              </button>
            </div>
          </div>

          {/* Main free-form entry */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              What happened today?
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={5}
              placeholder="Write freely… what stood out, how you felt, what mattered."
              className="w-full rounded-xl border border-[var(--border)] bg-surface px-4 py-3 text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {/* Gratitude */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Today I am grateful for
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={gratitude1}
                onChange={(e) => setGratitude1(e.target.value)}
                placeholder="1."
                className="w-full rounded-lg border border-[var(--border)] bg-surface px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                value={gratitude2}
                onChange={(e) => setGratitude2(e.target.value)}
                placeholder="2."
                className="w-full rounded-lg border border-[var(--border)] bg-surface px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                value={gratitude3}
                onChange={(e) => setGratitude3(e.target.value)}
                placeholder="3."
                className="w-full rounded-lg border border-[var(--border)] bg-surface px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Accomplishments */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              What I accomplished
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={accomplishment1}
                onChange={(e) => setAccomplishment1(e.target.value)}
                placeholder="1."
                className="w-full rounded-lg border border-[var(--border)] bg-surface px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                value={accomplishment2}
                onChange={(e) => setAccomplishment2(e.target.value)}
                placeholder="2."
                className="w-full rounded-lg border border-[var(--border)] bg-surface px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Optional deeper sections */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-secondary hover:text-primary transition-colors list-none flex items-center gap-2">
              <span className="group-open:rotate-90 transition-transform">▶</span>
              More reflection (optional)
            </summary>
            <div className="mt-4 space-y-5 pl-1">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  🙏 Spiritual
                </label>
                <textarea
                  value={spiritualNote}
                  onChange={(e) => setSpiritualNote(e.target.value)}
                  rows={2}
                  placeholder="Scripture, prayer, what God is teaching me…"
                  className="w-full rounded-lg border border-[var(--border)] bg-surface px-3 py-2 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  ❤️ Marriage / Relationship
                </label>
                <textarea
                  value={marriageNote}
                  onChange={(e) => setMarriageNote(e.target.value)}
                  rows={2}
                  placeholder="How I treated my wife, something I appreciated…"
                  className="w-full rounded-lg border border-[var(--border)] bg-surface px-3 py-2 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  💰 Financial / Career
                </label>
                <textarea
                  value={financialNote}
                  onChange={(e) => setFinancialNote(e.target.value)}
                  rows={2}
                  placeholder="Money thoughts, work progress, business…"
                  className="w-full rounded-lg border border-[var(--border)] bg-surface px-3 py-2 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  What did today teach me?
                </label>
                <input
                  type="text"
                  value={lessonOfDay}
                  onChange={(e) => setLessonOfDay(e.target.value)}
                  placeholder="One lesson…"
                  className="w-full rounded-lg border border-[var(--border)] bg-surface px-3 py-2 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  Prayer
                </label>
                <textarea
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  rows={2}
                  placeholder="What I’m praying about…"
                  className="w-full rounded-lg border border-[var(--border)] bg-surface px-3 py-2 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>
          </details>

          {/* Tomorrow + Mood */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Tomorrow’s most important action
              </label>
              <input
                type="text"
                value={tomorrowPriority}
                onChange={(e) => setTomorrowPriority(e.target.value)}
                placeholder="One clear priority…"
                className="w-full rounded-lg border border-[var(--border)] bg-surface px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Mood (optional)
              </label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="e.g. Grateful, Tired, Hopeful"
                className="w-full rounded-lg border border-[var(--border)] bg-surface px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>


          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-surface p-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Reflects on goal (optional)
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2.5 text-sm text-[var(--text)]"
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.area}: {g.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Photo / file URL (optional)
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2.5 text-sm text-[var(--text)]"
              />
              <p className="mt-1 text-xs text-secondary">
                Paste a public image or file link. Direct device upload can use cloud storage later.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <a
              href="/dashboard"
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving…" : "Save Entry"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
