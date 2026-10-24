/**
 * Period anchors for recurring actions.
 * Completion is stored on ActionLog.date = period start (UTC date).
 */

export type ActionRecurrenceKind =
  | "ONCE"
  | "DAILY"
  | "WEEKDAYS"
  | "WEEKLY"
  | "CUSTOM_DAYS"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY"
  | string;

function utcYmd(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d));
}

/** First day of the period that contains `now` (UTC). */
export function periodKeyDate(
  recurrence: ActionRecurrenceKind,
  now: Date = new Date(),
): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  switch (recurrence) {
    case "YEARLY":
      return utcYmd(y, 0, 1);
    case "QUARTERLY": {
      const qStart = Math.floor(m / 3) * 3;
      return utcYmd(y, qStart, 1);
    }
    case "MONTHLY":
      return utcYmd(y, m, 1);
    case "WEEKLY": {
      // Monday-start week in UTC
      const day = now.getUTCDay(); // 0 Sun
      const diff = day === 0 ? -6 : 1 - day;
      return utcYmd(y, m, d + diff);
    }
    case "DAILY":
    case "WEEKDAYS":
    case "CUSTOM_DAYS":
    case "ONCE":
    default:
      return utcYmd(y, m, d);
  }
}

export function isPeriodRecurring(recurrence: ActionRecurrenceKind): boolean {
  return recurrence !== "ONCE";
}

export function periodLabel(recurrence: ActionRecurrenceKind): string {
  switch (recurrence) {
    case "YEARLY":
      return "this year";
    case "QUARTERLY":
      return "this quarter";
    case "MONTHLY":
      return "this month";
    case "WEEKLY":
      return "this week";
    case "DAILY":
    case "WEEKDAYS":
    case "CUSTOM_DAYS":
      return "today";
    default:
      return "this period";
  }
}

/** Whether a log date counts as done for the current period of this recurrence. */
export function logMatchesPeriod(
  logDate: Date,
  recurrence: ActionRecurrenceKind,
  now: Date = new Date(),
): boolean {
  const key = periodKeyDate(recurrence, now);
  const ld = new Date(
    Date.UTC(logDate.getUTCFullYear(), logDate.getUTCMonth(), logDate.getUTCDate()),
  );
  if (
    recurrence === "DAILY" ||
    recurrence === "WEEKDAYS" ||
    recurrence === "CUSTOM_DAYS" ||
    recurrence === "ONCE"
  ) {
    return ld.getTime() === key.getTime();
  }
  // Weekly / monthly / quarterly / yearly: any log on the period key day
  // (we always write the period key on complete)
  return ld.getTime() === key.getTime();
}

export const RECURRENCE_OPTIONS: { value: ActionRecurrenceKind; label: string }[] = [
  { value: "ONCE", label: "Once" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKDAYS", label: "Weekdays" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM_DAYS", label: "Custom days" },
];
