/**
 * Compute current and best streak from completed habit log dates (YYYY-MM-DD or Date).
 * Streaks count consecutive calendar days ending today or yesterday (still "active").
 */
export function computeHabitStreaks(
  completedDates: Array<Date | string>,
  today: Date = new Date(),
): { current: number; best: number } {
  const days = new Set<string>();
  for (const d of completedDates) {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) continue;
    const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    days.add(key);
  }
  if (days.size === 0) return { current: 0, best: 0 };

  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseUTC(sorted[i - 1]);
    const cur = parseUTC(sorted[i]);
    const diff = (cur.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  // Current streak: walk back from today (or yesterday if today not logged)
  const todayKey = toKey(today);
  const y = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
  const yKey = toKey(y);

  let current = 0;
  let cursor: string | null = null;
  if (days.has(todayKey)) cursor = todayKey;
  else if (days.has(yKey)) cursor = yKey;

  while (cursor && days.has(cursor)) {
    current += 1;
    const dt = parseUTC(cursor);
    dt.setUTCDate(dt.getUTCDate() - 1);
    cursor = toKey(dt);
  }

  return { current, best: Math.max(best, current) };
}

function toKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function parseUTC(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
