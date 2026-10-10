/**
 * Consistent calendar-day policy for daily logs (habits, recurring actions).
 * Uses the server's local calendar date encoded as UTC midnight of that Y-M-D.
 * This matches the existing codebase convention and keeps @@unique([*, date]) stable.
 */
export function calendarDateOnly(from: Date = new Date()): Date {
  return new Date(
    Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()),
  );
}

/** Parse YYYY-MM-DD or ISO into a calendar date-only (UTC midnight of that day). */
export function parseCalendarDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return calendarDateOnly(parsed);
}
