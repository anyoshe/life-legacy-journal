"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, Circle, Plus, Trash2 } from "lucide-react";

export type TodayTodoItem = {
  id: string;
  title: string;
  timeOfDay: string | null;
  endTimeOfDay?: string | null;
  remindMinutesBefore?: number | null;
  completed: boolean;
  goalId?: string | null;
  goal?: { id: string; title: string; area: string } | null;
};

function formatWindow(start: string | null, end?: string | null) {
  if (!start && !end) return null;
  if (start && end) return `${start}–${end}`;
  return start || end || null;
}

function msUntilReminder(
  timeOfDay: string,
  remindMinutesBefore: number,
): number | null {
  const [h, m] = timeOfDay.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const when = new Date();
  when.setHours(h, m, 0, 0);
  when.setMinutes(when.getMinutes() - remindMinutesBefore);
  return when.getTime() - Date.now();
}

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
  const [endTimeOfDay, setEndTimeOfDay] = useState("");
  const [remindMinutesBefore, setRemindMinutesBefore] = useState("");
  const [goalId, setGoalId] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<string | null>(null);
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setList(items);
  }, [items]);

  // Browser reminders while this page/tab is open (not a system OS alarm service)
  useEffect(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();

    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    for (const item of list) {
      if (item.completed || !item.timeOfDay) continue;
      const mins = item.remindMinutesBefore;
      if (mins == null || mins < 0) continue;
      const delay = msUntilReminder(item.timeOfDay, mins);
      if (delay == null || delay <= 0 || delay > 24 * 60 * 60 * 1000) continue;

      const tid = window.setTimeout(() => {
        try {
          new Notification("Todo reminder", {
            body: item.title,
            tag: `todo-${item.id}`,
          });
        } catch {
          /* ignore */
        }
      }, delay);
      timers.current.set(item.id, tid);
    }

    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current.clear();
    };
  }, [list]);

  async function enableReminders() {
    if (!("Notification" in window)) {
      setNotifStatus("This browser does not support notifications.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifStatus(
      perm === "granted"
        ? "Reminders on while this tab is open."
        : "Notification permission denied.",
    );
  }

  const sorted = useMemo(
    () =>
      [...list].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const ta = a.timeOfDay || "99:99";
        const tb = b.timeOfDay || "99:99";
        return ta.localeCompare(tb);
      }),
    [list],
  );

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
      const remind =
        remindMinutesBefore.trim() === ""
          ? null
          : Number.parseInt(remindMinutesBefore, 10);
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          timeOfDay: timeOfDay || null,
          endTimeOfDay: endTimeOfDay || null,
          remindMinutesBefore:
            remind != null && !Number.isNaN(remind) ? remind : null,
          goalId: goalId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not add.");
      setList((prev) => [
        ...prev,
        {
          ...data.todo,
          completed: false,
          endTimeOfDay: data.todo.endTimeOfDay ?? (endTimeOfDay || null),
          remindMinutesBefore: data.todo.remindMinutesBefore ?? remind,
        },
      ]);
      setTitle("");
      setTimeOfDay("");
      setEndTimeOfDay("");
      setRemindMinutesBefore("");
      setGoalId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-secondary">
          Set a start and end time for your day timeline. Optional reminder uses
          browser notifications while this tab is open.
        </p>
        <button
          type="button"
          onClick={() => void enableReminders()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Bell size={14} aria-hidden />
          Allow reminders
        </button>
      </div>
      {notifStatus && (
        <p className="text-xs text-secondary">{notifStatus}</p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <form onSubmit={onAdd} className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="input-field w-full"
          required
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="block text-xs text-secondary">
            Start
            <input
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="input-field mt-1 w-full"
            />
          </label>
          <label className="block text-xs text-secondary">
            End
            <input
              type="time"
              value={endTimeOfDay}
              onChange={(e) => setEndTimeOfDay(e.target.value)}
              className="input-field mt-1 w-full"
            />
          </label>
          <label className="block text-xs text-secondary">
            Remind (min before)
            <input
              type="number"
              min={0}
              max={1440}
              placeholder="e.g. 15"
              value={remindMinutesBefore}
              onChange={(e) => setRemindMinutesBefore(e.target.value)}
              className="input-field mt-1 w-full"
            />
          </label>
          <label className="block text-xs text-secondary">
            Goal (optional)
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="input-field mt-1 w-full"
            >
              <option value="">None</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 disabled:opacity-50"
        >
          <Plus size={16} aria-hidden />
          {adding ? "Adding…" : "Add to today"}
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-sm text-secondary">
          No day items yet. Goal work still lives under{" "}
          <Link href="/goals" className="font-medium text-primary hover:underline">
            Actions
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((item) => {
            const windowLabel = formatWindow(
              item.timeOfDay,
              item.endTimeOfDay,
            );
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
              >
                <button
                  type="button"
                  disabled={pending === item.id}
                  onClick={() => void toggle(item)}
                  className="mt-0.5 shrink-0 text-primary disabled:opacity-40"
                  aria-label={
                    item.completed ? "Mark incomplete" : "Mark complete"
                  }
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
                    {windowLabel && (
                      <span className="mr-2 font-semibold text-primary">
                        {windowLabel}
                      </span>
                    )}
                    {item.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-secondary">
                    {item.remindMinutesBefore != null && item.timeOfDay && (
                      <span className="inline-flex items-center gap-0.5">
                        <Bell size={12} aria-hidden />
                        {item.remindMinutesBefore === 0
                          ? "At start"
                          : `${item.remindMinutesBefore} min before`}
                      </span>
                    )}
                    {item.goal && (
                      <Link
                        href={`/goals/${item.goal.id}`}
                        className="hover:text-primary"
                      >
                        → {item.goal.title}
                      </Link>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pending === item.id}
                  onClick={() => void remove(item.id)}
                  className="shrink-0 text-muted hover:text-danger"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
