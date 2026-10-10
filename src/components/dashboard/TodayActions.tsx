"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Check, Circle, ArrowRight } from "lucide-react";

export type TodayActionItem = {
  id: string;
  goalId: string;
  goalTitle: string;
  area: string;
  title: string;
  doneToday: boolean;
};

export function TodayActions({ items }: { items: TodayActionItem[] }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(item: TodayActionItem) {
    setPending(item.id);
    setError(null);
    const next = !item.doneToday;
    try {
      const res = await fetch(`/api/goals/${item.goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: item.id, completed: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update action.");
      setList((prev) =>
        prev.map((a) =>
          a.id === item.id ? { ...a, doneToday: next } : a,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update action.");
    } finally {
      setPending(null);
    }
  }

  if (list.length === 0) {
    return (
      <div className="card p-4 text-sm text-secondary">
        No open actions.{" "}
        <Link href="/goals" className="font-medium text-primary">
          Add on a goal
        </Link>
      </div>
    );
  }

  const done = list.filter((a) => a.doneToday).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-secondary">
        {done}/{list.length} done
      </p>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {list.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-surface px-3 py-2.5"
        >
          <button
            type="button"
            disabled={pending === item.id}
            onClick={() => void toggle(item)}
            className="mt-0.5 text-primary disabled:opacity-40"
            aria-label={item.doneToday ? "Undo" : "Mark done"}
          >
            {item.doneToday ? <Check size={18} /> : <Circle size={18} />}
          </button>
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm ${
                item.doneToday
                  ? "text-secondary line-through"
                  : "font-medium text-[var(--text)]"
              }`}
            >
              {item.title}
            </p>
            <p className="text-xs text-secondary">
              {item.area} · {item.goalTitle}
            </p>
          </div>
          <Link
            href={`/goals/${item.goalId}`}
            className="text-xs text-primary"
          >
            Goal
          </Link>
        </div>
      ))}
      <Link
        href="/goals"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary"
      >
        All goals <ArrowRight size={12} />
      </Link>
    </div>
  );
}
