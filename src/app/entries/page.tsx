"use client";

import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
import { MoodCanvas } from "@/components/ui/MoodCanvas";
import { PageIntro } from "@/components/ui/PageIntro";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Heart,
  Search,
} from "lucide-react";

type EntryListItem = {
  id: string;
  userId: string;
  type: string;
  visibility: "PRIVATE" | "SHARED_WITH_PARTNER";
  title: string | null;
  content: string;
  preview: string;
  mood: string | null;
  tags: string[];
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const ENTRY_TYPES = [
  "DAILY",
  "SPIRITUAL",
  "MARRIAGE",
  "FINANCIAL",
  "CAREER",
  "BUSINESS",
  "EXPERIENCE",
  "GRATITUDE",
  "REFLECTION",
  "OTHER",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function JournalHistoryInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState<EntryListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [visibility, setVisibility] = useState(searchParams.get("visibility") ?? "ALL");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [mood, setMood] = useState(searchParams.get("mood") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [scope, setScope] = useState(searchParams.get("scope") ?? "all");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1") || 1);

  // Applied filters (only change when user clicks Apply or page changes)
  const [applied, setApplied] = useState({
    q: searchParams.get("q") ?? "",
    visibility: searchParams.get("visibility") ?? "ALL",
    type: searchParams.get("type") ?? "",
    mood: searchParams.get("mood") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    scope: searchParams.get("scope") ?? "all",
  });

  const loadEntries = useCallback(
    async (
      pageNum: number,
      filters: typeof applied,
      signal?: AbortSignal,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("pageSize", "20");
        params.set("scope", filters.scope);
        if (filters.q.trim()) params.set("q", filters.q.trim());
        if (filters.visibility && filters.visibility !== "ALL") {
          params.set("visibility", filters.visibility);
        }
        if (filters.type) params.set("type", filters.type);
        if (filters.mood.trim()) params.set("mood", filters.mood.trim());
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);

        const response = await fetch(`/api/entries?${params.toString()}`, {
          signal,
        });
        if (signal?.aborted) return;
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load journal.");

        setEntries(data.entries ?? []);
        setPagination(
          data.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 },
        );
        // Never force URL if user already left Journal (was jumping back from Dreams etc.)
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/entries")) {
          router.replace(`/entries?${params.toString()}`, { scroll: false });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load journal.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadEntries(page, applied, ac.signal);
    return () => ac.abort();
  }, [page, applied, loadEntries]);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied({ q, visibility, type, mood, from, to, scope });
  }

  function clearFilters() {
    setQ("");
    setVisibility("ALL");
    setType("");
    setMood("");
    setFrom("");
    setTo("");
    setScope("all");
    setPage(1);
    setApplied({
      q: "",
      visibility: "ALL",
      type: "",
      mood: "",
      from: "",
      to: "",
      scope: "all",
    });
  }

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="journal">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-8 sm:px-6 lg:px-8">
        <PageIntro
          eyebrow="Your personal archive"
          title="Journal"
          description="Browse, search, and rediscover past reflections. Private by default."
          action={
            <Link href="/entry/new" className="btn-primary">
              Write an entry
            </Link>
          }
        />

        <form
          onSubmit={applyFilters}
          className="mb-6 space-y-3 rounded-2xl border border-[var(--border)] bg-surface p-4"
        >
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search content, mood, lessons…"
              className="w-full rounded-xl border border-[var(--border)] bg-background py-2.5 pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium text-secondary">
              Scope
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
              >
                <option value="all">Mine + shared with me</option>
                <option value="mine">Only mine</option>
                <option value="shared">Shared by partner</option>
              </select>
            </label>

            <label className="text-xs font-medium text-secondary">
              Visibility
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
              >
                <option value="ALL">Any</option>
                <option value="PRIVATE">Private</option>
                <option value="SHARED_WITH_PARTNER">Shared</option>
              </select>
            </label>

            <label className="text-xs font-medium text-secondary">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
              >
                <option value="">Any type</option>
                {ENTRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-medium text-secondary">
              Mood contains
              <input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>

            <label className="text-xs font-medium text-secondary">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>

            <label className="text-xs font-medium text-secondary">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg px-3 py-2 text-sm text-secondary hover:text-primary"
            >
              Clear
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
            >
              Apply filters
            </button>
          </div>
        </form>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-secondary">Loading your journal…</p>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center">
            <BookOpen className="mx-auto mb-3 text-primary" size={28} />
            <h2 className="font-semibold text-[var(--text)]">No entries match</h2>
            <p className="mt-1 text-sm text-secondary">
              Write a reflection, or clear filters to see your history.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {entries.map((entry) => (
              <Link
                key={entry.id}
                href={`/entries/${entry.id}`}
                className={`block rounded-2xl border p-5 transition-colors hover:border-primary/30 ${
                  entry.visibility === "PRIVATE"
                    ? "border-[var(--border)] bg-private"
                    : "border-[var(--border)] bg-shared"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                  <span>{formatDate(entry.createdAt)}</span>
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
                      <Heart size={12} /> Shared
                    </span>
                  )}
                  {!entry.isOwner && <span className="text-muted">· From partner</span>}
                </div>
                {entry.title && (
                  <h2 className="mt-2 font-semibold text-[var(--text)]">{entry.title}</h2>
                )}
                <p className="mt-2 text-sm leading-6 text-secondary">{entry.preview}</p>
                {(entry.mood || (entry.tags && entry.tags.length > 0)) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    {entry.mood && (
                      <span className="rounded-full bg-background px-2 py-0.5">
                        Mood: {entry.mood}
                      </span>
                    )}
                    {entry.tags?.map((tag) => (
                      <span key={tag} className="rounded-full bg-background px-2 py-0.5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <p className="text-sm text-secondary">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
            </p>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>
      </MoodCanvas>
    </AppShell>
  );
}

export default function JournalHistoryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background text-sm text-secondary">
          Loading journal…
        </main>
      }
    >
      <JournalHistoryInner />
    </Suspense>
  );
}
