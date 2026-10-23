"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { FREE_MEMORY_PHOTO_LIMIT } from "@/lib/memories";

type Memory = {
  id: string;
  title: string;
  story: string;
  kind: string;
  imageUrl: string;
  createdAt: string;
};

type Quota = {
  used: number;
  limit: number;
  tier: string;
  remaining: number;
};

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [kind, setKind] = useState<"MEMORY" | "ACHIEVEMENT">("MEMORY");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/memories");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load memories.");
      setMemories(data.memories || []);
      setQuota(data.quota || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load memories.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a photo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("story", story);
      fd.set("kind", kind);
      fd.set("photo", file);
      const res = await fetch("/api/memories", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setTitle("");
      setStory("");
      setFile(null);
      setShowForm(false);
      setQuota(data.quota || null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this memory from your album?")) return;
    const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  const atLimit = quota != null && quota.remaining <= 0 && quota.tier === "FREE";

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="journal">
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                My album
              </p>
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                Memories &amp; achievements
              </h1>
              <p className="mt-1 max-w-xl text-sm text-secondary">
                Photos with the story of what they mean to you — a private album you can
                revisit and download.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/memories/download"
                className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium"
              >
                Download album
              </a>
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="btn-primary rounded-full px-4 py-2 text-sm"
              >
                {showForm ? "Close" : "Add photo"}
              </button>
            </div>
          </header>

          {quota && (
            <p className="text-sm text-secondary">
              {quota.used} / {quota.limit} photos
              {quota.tier === "FREE" && (
                <span>
                  {" "}
                  · Free plan ({FREE_MEMORY_PHOTO_LIMIT} photos).{" "}
                  <Link href="/memories#upgrade" className="font-medium text-primary">
                    Need more space? Upgrade
                  </Link>
                </span>
              )}
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </p>
          )}

          {showForm && (
            <form onSubmit={onSubmit} className="card space-y-3 p-5">
              {atLimit ? (
                <div id="upgrade" className="space-y-2">
                  <p className="font-semibold text-[var(--text)]">Album is full on Free</p>
                  <p className="text-sm text-secondary">
                    You have used all {FREE_MEMORY_PHOTO_LIMIT} free photo slots. Upgrade to
                    PLUS to store more memories and achievements.
                  </p>
                  <p className="text-xs text-muted">
                    Subscription billing can be connected later (e.g. Stripe). For now, an
                    admin can set your plan to PLUS in the database.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setKind("MEMORY")}
                      className={
                        kind === "MEMORY"
                          ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                          : "rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                      }
                    >
                      Memory
                    </button>
                    <button
                      type="button"
                      onClick={() => setKind("ACHIEVEMENT")}
                      className={
                        kind === "ACHIEVEMENT"
                          ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                          : "rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                      }
                    >
                      Achievement
                    </button>
                  </div>
                  <label className="block text-sm font-medium">
                    Title
                    <input
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="input-field mt-1 w-full"
                      placeholder="e.g. First family trip"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    What does this remind you of?
                    <textarea
                      required
                      value={story}
                      onChange={(e) => setStory(e.target.value)}
                      rows={3}
                      className="input-field mt-1 w-full"
                      placeholder="The story behind the photo…"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Photo
                    <input
                      required
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="mt-1 block w-full text-sm"
                    />
                  </label>
                  <button type="submit" disabled={busy} className="btn-primary">
                    {busy ? "Saving…" : "Save to album"}
                  </button>
                </>
              )}
            </form>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memories.map((m) => (
              <article
                key={m.id}
                className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.imageUrl}
                  alt={m.title}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="space-y-2 p-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                    {m.kind === "ACHIEVEMENT" ? "Achievement" : "Memory"}
                  </p>
                  <h2 className="font-semibold text-[var(--text)]">{m.title}</h2>
                  <p className="text-sm text-secondary line-clamp-4">{m.story}</p>
                  <div className="flex gap-2 pt-1">
                    <a
                      href={m.imageUrl}
                      download
                      className="text-xs font-medium text-primary"
                    >
                      Download photo
                    </a>
                    <button
                      type="button"
                      onClick={() => void remove(m.id)}
                      className="text-xs text-secondary hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {memories.length === 0 && (
            <p className="text-center text-sm text-secondary">
              No photos yet. Add a memory or achievement to start your album.
            </p>
          )}

          <section
            id="upgrade"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-gold)]/40 p-5"
          >
            <h2 className="font-semibold text-[var(--text)]">Need more than 5 photos?</h2>
            <p className="mt-1 text-sm text-secondary">
              Free plan includes {FREE_MEMORY_PHOTO_LIMIT} photos. Upgrade to PLUS for a larger
              album and more room for life’s milestones.
            </p>
          </section>
        </main>
      </MoodCanvas>
    </AppShell>
  );
}
