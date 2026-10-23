/** Payment deadline = your target finish date (or lender due date if you use that). Either is valid. */

export type TimeScale = "days" | "weeks" | "months" | "years";

export function repaymentProgress(opts: {
  totalOwed: number;
  amountPaid: number;
  balance: number;
  /** ISO date or Date — payment deadline */
  deadline: string | Date | null | undefined;
  /** When the debt was recorded / borrowed */
  start?: string | Date | null;
}) {
  const total = Math.max(0, opts.totalOwed || 0);
  const paid = Math.max(0, opts.amountPaid || 0);
  const balance = Math.max(0, opts.balance ?? total - paid);
  const pctPaid = total > 0 ? Math.min(100, Math.round((paid / total) * 1000) / 10) : 0;

  const now = new Date();
  const end = opts.deadline ? new Date(opts.deadline) : null;
  const start = opts.start ? new Date(opts.start) : null;

  let daysRemaining: number | null = null;
  let daysTotal: number | null = null;
  let timeElapsedPct: number | null = null;
  let scale: TimeScale = "months";
  let remainingLabel = "No deadline set";
  let scheduleHint = "";

  if (end && !Number.isNaN(end.getTime())) {
    const msDay = 86400000;
    daysRemaining = Math.ceil((end.getTime() - now.getTime()) / msDay);
    const startMs = start && !Number.isNaN(start.getTime()) ? start.getTime() : now.getTime();
    daysTotal = Math.max(1, Math.ceil((end.getTime() - startMs) / msDay));
    const elapsed = Math.max(0, Math.min(daysTotal, daysTotal - (daysRemaining ?? 0)));
    timeElapsedPct = Math.min(100, Math.round((elapsed / daysTotal) * 100));

    const absRem = Math.abs(daysRemaining);
    if (absRem >= 365 * 2) {
      scale = "years";
      const y = Math.round((absRem / 365) * 10) / 10;
      remainingLabel =
        daysRemaining < 0 ? `${y} years overdue` : `${y} years left`;
    } else if (absRem >= 60) {
      scale = "months";
      const m = Math.round((absRem / 30) * 10) / 10;
      remainingLabel =
        daysRemaining < 0 ? `${m} months overdue` : `${m} months left`;
    } else if (absRem >= 14) {
      scale = "weeks";
      const w = Math.round((absRem / 7) * 10) / 10;
      remainingLabel =
        daysRemaining < 0 ? `${w} weeks overdue` : `${w} weeks left`;
    } else {
      scale = "days";
      remainingLabel =
        daysRemaining < 0
          ? `${absRem} day${absRem === 1 ? "" : "s"} overdue`
          : daysRemaining === 0
            ? "Due today"
            : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`;
    }

    if (balance > 0 && daysRemaining != null && daysRemaining > 0) {
      const perDay = balance / daysRemaining;
      if (scale === "years") {
        scheduleHint = `~${Math.ceil(perDay * 365).toLocaleString()} / year to finish on time`;
      } else if (scale === "months") {
        scheduleHint = `~${Math.ceil(perDay * 30).toLocaleString()} / month to finish on time`;
      } else if (scale === "weeks") {
        scheduleHint = `~${Math.ceil(perDay * 7).toLocaleString()} / week to finish on time`;
      } else {
        scheduleHint = `~${Math.ceil(perDay).toLocaleString()} / day to finish on time`;
      }
    }
  }

  return {
    pctPaid,
    balance,
    paid,
    total,
    daysRemaining,
    daysTotal,
    timeElapsedPct,
    scale,
    remainingLabel,
    scheduleHint,
    onTrack:
      timeElapsedPct == null || pctPaid >= timeElapsedPct - 5 || balance <= 0,
  };
}
