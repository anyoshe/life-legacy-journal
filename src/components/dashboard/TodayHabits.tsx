"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Check, Circle, ArrowRight } from "lucide-react";

export type TodayHabitItem = {
  id: string;
  title: string;
  targetPerWeek: number;
  doneToday: boolean;
};

export function TodayHabits({ items }: { items: TodayHabitItem[] }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(item: TodayHabitItem) {
    setPending(item.id);
    setError(null);
    const next = !item.doneToday;
    try {
      const res = await fetch(`/api/habits/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update habit.");
      setList((prev) =>
        prev.map((h) =>
          h.id === item.id ? { ...h, doneToday: next } : h,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update habit.");
    } finally {
      setPending(null);
    }
  }

  if (list.length === 0) {
    return (
      <div className="card p-4 text-sm text-secondary">
        No active habits.{" "}
        <Link href="/habits" className="font-medium text-primary">
          Add one
        </Link>
      </div>
    );
  }

  const done = list.filter((h) => h.doneToday).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-secondary">
        {done}/{list.length} done today
      </p>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {list.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-surface px-3 py-2.5"
        >
          <button
            type="button"
            disabled={pending === item.id}
            onClick={() => void toggle(item)}
            className="text-primary disabled:opacity-40"
            aria-label={item.doneToday ? "Undo" : "Mark done"}
          >
            {item.doneToday ? <Check size={18} /> : <Circle size={18} />}
          </button>
          <span
            className={`flex-1 text-sm ${
              item.doneToday
                ? "text-secondary line-through"
                : "font-medium text-[var(--text)]"
            }`}
          >
            {item.title}
          </span>
        </div>
      ))}
      <Link
        href="/habits"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary"
      >
        Manage habits <ArrowRight size={12} />
      </Link>
    </div>
  );
}
