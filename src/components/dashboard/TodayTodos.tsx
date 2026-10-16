"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Circle, Plus, Trash2 } from "lucide-react";

export type TodayTodoItem = {
  id: string;
  title: string;
  timeOfDay: string | null;
  completed: boolean;
  goalId?: string | null;
  goal?: { id: string; title: string; area: string } | null;
};

export function TodayTodos({
  items,
  goals,
}: {
  items: TodayTodoItem[];
  goals: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [title, setTitle] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [goalId, setGoalId] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(item: TodayTodoItem) {
    setPending(item.id);
    setError(null);
    const next = !item.completed;
    try {
      const res = await fetch(`/api/todos/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update.");
      setList((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, completed: next } : t)),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setPending(null);
    }
  }

  async function remove(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Could not delete.");
      setList((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setPending(null);
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          timeOfDay: timeOfDay || null,
          goalId: goalId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add.");
      setList((prev) => [...prev, { ...data.todo, completed: false }]);
      setTitle("");
      setTimeOfDay("");
      setGoalId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add.");
    } finally {
      setAdding(false);
    }
  }

  const done = list.filter((t) => t.completed).length;
  const sorted = [...list].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const ta = a.timeOfDay || "99:99";
    const tb = b.timeOfDay || "99:99";
    return ta.localeCompare(tb);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-secondary">
          {done}/{list.length} done · day list (not the same as goal actions)
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={onAdd} className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-surface p-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-medium text-secondary">
          Add for today
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Call, errand, reminder…"
            className="input-field mt-1"
            required
          />
        </label>
        <label className="text-xs font-medium text-secondary">
          Time
          <input
            type="time"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            className="input-field mt-1 w-full sm:w-32"
          />
        </label>
        <label className="text-xs font-medium text-secondary">
          Goal (optional)
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="input-field mt-1 min-w-[10rem]"
          >
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={adding} className="btn-primary shrink-0">
          <Plus size={16} /> {adding ? "…" : "Add"}
        </button>
      </form>

      {sorted.length === 0 ? (
        <div className="card p-4 text-sm text-secondary">
          No timed day items yet. Goal work still lives under{" "}
          <Link href="/goals" className="font-medium text-primary">
            Actions
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-surface px-3 py-2.5"
            >
              <button
                type="button"
                disabled={pending === item.id}
                onClick={() => void toggle(item)}
                className="mt-0.5 text-primary disabled:opacity-40"
                aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
              >
                {item.completed ? <Check size={18} /> : <Circle size={18} />}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    item.completed
                      ? "text-sm text-secondary line-through"
                      : "text-sm font-medium text-[var(--text)]"
                  }
                >
                  {item.timeOfDay && (
                    <span className="mr-2 font-semibold text-primary">{item.timeOfDay}</span>
                  )}
                  {item.title}
                </p>
                {item.goal && (
                  <Link
                    href={`/goals/${item.goal.id}`}
                    className="text-xs text-secondary hover:text-primary"
                  >
                    → {item.goal.title}
                  </Link>
                )}
              </div>
              <button
                type="button"
                disabled={pending === item.id}
                onClick={() => void remove(item.id)}
                className="text-muted hover:text-danger"
                aria-label="Delete"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
