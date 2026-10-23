/**
 * Simple interest accrued over the unpaid period.
 * MONTHLY: principal × (rate%/100) × months unpaid
 * YEARLY:  principal × (rate%/100) × years unpaid
 * Period from borrowedAt → asOf (default today).
 * If no borrow date, uses 1 period (single rate application).
 */

export type InterestPeriodKind = "MONTHLY" | "YEARLY";

export function monthsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

export function yearsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

function parseDate(v: Date | string): Date {
  if (v instanceof Date) return v;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T12:00:00.000Z`);
  return new Date(s);
}

export function interestAccrued(opts: {
  principal: number;
  ratePercent: number | null | undefined;
  period: InterestPeriodKind;
  borrowedAt?: Date | string | null;
  asOf?: Date | null;
}): number {
  const principal = opts.principal;
  const rate = opts.ratePercent ?? 0;
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }

  let periods = 1;
  if (opts.borrowedAt) {
    const start = parseDate(opts.borrowedAt);
    const end = opts.asOf ?? new Date();
    if (!Number.isNaN(start.getTime())) {
      periods =
        opts.period === "MONTHLY"
          ? monthsBetween(start, end)
          : yearsBetween(start, end);
      if (periods < 0) periods = 0;
    }
  }

  return Math.round(principal * (rate / 100) * periods * 100) / 100;
}

export function totalFromPrincipalAndRate(
  principal: number,
  ratePercent: number | null | undefined,
  autoCalc: boolean,
  manualTotal: number | null | undefined,
  opts?: {
    period?: InterestPeriodKind;
    borrowedAt?: Date | string | null;
    asOf?: Date | null;
  },
): number {
  if (!autoCalc && manualTotal != null && Number.isFinite(manualTotal) && manualTotal > 0) {
    return Math.round(manualTotal * 100) / 100;
  }
  const interest = interestAccrued({
    principal,
    ratePercent,
    period: opts?.period ?? "YEARLY",
    borrowedAt: opts?.borrowedAt,
    asOf: opts?.asOf,
  });
  return Math.round((principal + interest) * 100) / 100;
}

export function unpaidPeriodLabel(
  borrowedAt: string | Date | null | undefined,
  period: InterestPeriodKind,
  asOf: Date = new Date(),
): string {
  if (!borrowedAt) return "Set “when borrowed” for time-based interest";
  const start = parseDate(borrowedAt);
  if (Number.isNaN(start.getTime())) return "";
  if (period === "MONTHLY") {
    const m = monthsBetween(start, asOf);
    return `${Math.round(m * 10) / 10} months unpaid`;
  }
  const y = yearsBetween(start, asOf);
  return `${Math.round(y * 10) / 10} years unpaid`;
}
