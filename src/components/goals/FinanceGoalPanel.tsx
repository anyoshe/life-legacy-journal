"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  mode: "DEBT" | "SAVINGS";
  currency: string;
  creditorName?: string | null;
  borrowedAt?: string | null;
  principal?: number | null;
  interestRate?: number | null;
  totalOwed?: number | null;
  amountPaid: number;
  balance?: number | null;
  targetAmount?: number | null;
  savedAmount: number;
  savingsDestination?: string | null;
  transactions: {
    id: string;
    kind: string;
    amount: number;
    paymentMethod?: string | null;
    note?: string | null;
    occurredAt: string;
  }[];
};

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length === 3 ? currency : "KES",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function fmtWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const METHODS = ["M-Pesa", "Bank transfer", "Cash", "Card", "Cheque", "Other"];

export function FinanceGoalPanel({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"DEBT" | "SAVINGS">("DEBT");

  // Setup form
  const [creditorName, setCreditorName] = useState("");
  const [borrowedAt, setBorrowedAt] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [totalOwed, setTotalOwed] = useState("");
  const [deadline, setDeadline] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [currency, setCurrency] = useState("KES");

  // Transaction form
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("M-Pesa");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/${goalId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load finance.");
      setPlan(data.plan);
      if (data.plan) setMode(data.plan.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load finance.");
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePlan(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === "DEBT"
          ? {
              mode: "DEBT" as const,
              currency,
              creditorName,
              borrowedAt: borrowedAt
                ? new Date(borrowedAt).toISOString()
                : null,
              principal: Number(principal),
              interestRate: interestRate === "" ? null : Number(interestRate),
              totalOwed:
                totalOwed === "" ? Number(principal) : Number(totalOwed),
              deadline: deadline ? new Date(deadline).toISOString() : null,
            }
          : {
              mode: "SAVINGS" as const,
              currency,
              targetAmount: Number(targetAmount),
              savingsDestination: destination || null,
              deadline: deadline ? new Date(deadline).toISOString() : null,
            };

      const res = await fetch(`/api/finance/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setPlan(data.plan);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function recordTxn(e: FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      const kind = plan.mode === "DEBT" ? "PAYMENT" : "CONTRIBUTION";
      const res = await fetch(`/api/finance/${goalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          amount: Number(amount),
          paymentMethod: method,
          note: note || null,
          occurredAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not record.");
      setPlan(data.plan);
      setAmount("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record.");
    } finally {
      setBusy(false);
    }
  }

  async function addInterest(e: FormEvent) {
    e.preventDefault();
    if (!plan || plan.mode !== "DEBT") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/${goalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "INTEREST",
          amount: Number(amount),
          note: note || "Interest accrued",
          occurredAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add interest.");
      setPlan(data.plan);
      setAmount("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add interest.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-secondary">Loading finance…</p>;
  }

  return (
    <section className="card space-y-5 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--achievement)]">
          Finance tracker
        </p>
        <h3 className="text-lg font-semibold text-[var(--text)]">
          Numbers, payments &amp; timeline
        </h3>
        <p className="mt-1 text-sm text-secondary">
          Debt: who you owe, principal, interest, payments, balance. Savings:
          target, deposits, remaining. Every movement is timestamped.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {!plan ? (
        <form onSubmit={savePlan} className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("DEBT")}
              className={
                mode === "DEBT"
                  ? "rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-[var(--border)] px-4 py-1.5 text-sm"
              }
            >
              Debt free
            </button>
            <button
              type="button"
              onClick={() => setMode("SAVINGS")}
              className={
                mode === "SAVINGS"
                  ? "rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-[var(--border)] px-4 py-1.5 text-sm"
              }
            >
              Save for a goal
            </button>
          </div>

          <label className="block text-xs text-secondary">
            Currency
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="input-field mt-1 w-full"
              maxLength={8}
            />
          </label>

          {mode === "DEBT" ? (
            <>
              <label className="block text-xs text-secondary">
                Who I owe
                <input
                  required
                  value={creditorName}
                  onChange={(e) => setCreditorName(e.target.value)}
                  className="input-field mt-1 w-full"
                  placeholder="Person, bank, SACCO…"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs text-secondary">
                  When borrowed
                  <input
                    type="date"
                    value={borrowedAt}
                    onChange={(e) => setBorrowedAt(e.target.value)}
                    className="input-field mt-1 w-full"
                  />
                </label>
                <label className="block text-xs text-secondary">
                  Payment deadline
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="input-field mt-1 w-full"
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block text-xs text-secondary">
                  Principal
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    className="input-field mt-1 w-full"
                  />
                </label>
                <label className="block text-xs text-secondary">
                  Interest rate % / year
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="input-field mt-1 w-full"
                    placeholder="Optional"
                  />
                </label>
                <label className="block text-xs text-secondary">
                  Total owed (if known)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={totalOwed}
                    onChange={(e) => setTotalOwed(e.target.value)}
                    className="input-field mt-1 w-full"
                    placeholder="Defaults to principal"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <label className="block text-xs text-secondary">
                Goal amount (target)
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="input-field mt-1 w-full"
                />
              </label>
              <label className="block text-xs text-secondary">
                Where I am saving
                <input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="input-field mt-1 w-full"
                  placeholder="Bank, M-Pesa, SACCO…"
                />
              </label>
              <label className="block text-xs text-secondary">
                Target date
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-field mt-1 w-full"
                />
              </label>
            </>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
            {busy ? "Saving…" : "Save finance plan"}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          {plan.mode === "DEBT" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[var(--surface-gold)] p-3">
                <p className="text-[0.65rem] uppercase text-secondary">Owed to</p>
                <p className="font-semibold text-[var(--text)]">{plan.creditorName}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-gold)] p-3">
                <p className="text-[0.65rem] uppercase text-secondary">Total owed</p>
                <p className="font-semibold text-[var(--text)]">
                  {money(plan.totalOwed ?? plan.principal ?? 0, plan.currency)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--surface-gold)] p-3">
                <p className="text-[0.65rem] uppercase text-secondary">Balance left</p>
                <p className="font-semibold text-primary">
                  {money(plan.balance ?? 0, plan.currency)}
                </p>
                <p className="text-xs text-secondary">
                  Paid {money(plan.amountPaid, plan.currency)}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[var(--surface-gold)] p-3">
                <p className="text-[0.65rem] uppercase text-secondary">Target</p>
                <p className="font-semibold">
                  {money(plan.targetAmount ?? 0, plan.currency)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--surface-gold)] p-3">
                <p className="text-[0.65rem] uppercase text-secondary">Saved</p>
                <p className="font-semibold text-primary">
                  {money(plan.savedAmount, plan.currency)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--surface-gold)] p-3">
                <p className="text-[0.65rem] uppercase text-secondary">Still to go</p>
                <p className="font-semibold">
                  {money(
                    Math.max(0, (plan.targetAmount ?? 0) - plan.savedAmount),
                    plan.currency,
                  )}
                </p>
                {plan.savingsDestination && (
                  <p className="text-xs text-secondary">→ {plan.savingsDestination}</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={recordTxn} className="space-y-2 rounded-xl border border-[var(--border)] p-3">
            <p className="text-sm font-medium text-[var(--text)]">
              {plan.mode === "DEBT" ? "Record a payment" : "Record a deposit"}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block text-xs text-secondary">
                Amount
                <input
                  required
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field mt-1 w-full"
                />
              </label>
              <label className="block text-xs text-secondary">
                Mode of payment
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="input-field mt-1 w-full"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-secondary">
                Note
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input-field mt-1 w-full"
                  placeholder="Optional"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
                {plan.mode === "DEBT" ? "Pay" : "Save deposit"}
              </button>
              {plan.mode === "DEBT" && (
                <button
                  type="button"
                  disabled={busy || !amount}
                  onClick={(e) => void addInterest(e as unknown as FormEvent)}
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Accrue interest (add to total owed)
                </button>
              )}
            </div>
          </form>

          <div>
            <h4 className="text-sm font-semibold text-[var(--text)]">Timeline</h4>
            {plan.transactions.length === 0 ? (
              <p className="mt-2 text-sm text-secondary">No movements yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {plan.transactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-[var(--text)]">
                        {t.kind.replaceAll("_", " ")} · {money(t.amount, plan.currency)}
                      </span>
                      {t.paymentMethod && (
                        <span className="ml-2 text-secondary">via {t.paymentMethod}</span>
                      )}
                      {t.note && (
                        <p className="text-xs text-secondary">{t.note}</p>
                      )}
                    </div>
                    <time className="text-xs text-muted">{fmtWhen(t.occurredAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
