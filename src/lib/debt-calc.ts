/** Simple interest on principal for one period (rate already monthly or yearly). */
export function interestAmount(principal: number, ratePercent: number): number {
  if (!Number.isFinite(principal) || !Number.isFinite(ratePercent)) return 0;
  return Math.round(principal * (ratePercent / 100) * 100) / 100;
}

export function totalFromPrincipalAndRate(
  principal: number,
  ratePercent: number | null | undefined,
  autoCalc: boolean,
  manualTotal: number | null | undefined,
): number {
  if (!autoCalc && manualTotal != null && Number.isFinite(manualTotal) && manualTotal > 0) {
    return manualTotal;
  }
  const rate = ratePercent ?? 0;
  return Math.round((principal + interestAmount(principal, rate)) * 100) / 100;
}
