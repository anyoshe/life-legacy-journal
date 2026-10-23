"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
import { repaymentProgress } from "@/lib/debt-progress";
import {
  interestAccrued,
  totalFromPrincipalAndRate,
  unpaidPeriodLabel,
} from "@/lib/debt-calc";
import { MoodCanvas } from "@/components/ui/MoodCanvas";

type Tab = "overview" | "creditors" | "accounts" | "expenses" | "assets";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "creditors", label: "Creditors" },
  { id: "accounts", label: "Money I have" },
  { id: "expenses", label: "Expenses" },
  { id: "assets", label: "Assets" },
];

function money(n: number, currency = "KES") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length === 3 ? currency : "KES",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}

export default function FinanceHubPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<{
    moneyAvailable: number;
    assetsTotal: number;
    totalDebt: number;
    netWorthApprox: number;
    expensesThisMonth: number;
  } | null>(null);
  const [creditors, setCreditors] = useState<
    {
      goalId: string;
      creditorName: string;
      balance: number;
      totalOwed: number;
      amountPaid: number;
      currency: string;
      goalTitle: string;
      deadline?: string | null;
      borrowedAt?: string | null;
      borrowReason?: string | null;
      principal?: number | null;
      interestRate?: number | null;
      interestPeriod?: string;
      autoCalcTotal?: boolean;
    }[]
  >([]);
  const [accounts, setAccounts] = useState<
    { id: string; name: string; kind: string; balance: number; currency: string }[]
  >([]);
  const [expenses, setExpenses] = useState<
    {
      id: string;
      amount: number;
      category: string | null;
      description: string | null;
      occurredAt: string;
      moneyAccount: { name: string };
    }[]
  >([]);
  const [assets, setAssets] = useState<
    { id: string; name: string; value: number; category: string | null; currency: string }[]
  >([]);

  // Pay modal
  const [payGoalId, setPayGoalId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [payMethod, setPayMethod] = useState("M-Pesa");
  const [payNote, setPayNote] = useState("");
  const [fundingNote, setFundingNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Forms
  const [accName, setAccName] = useState("");
  const [accBalance, setAccBalance] = useState("");
  const [accKind, setAccKind] = useState("MPESA");
  const [expAmount, setExpAmount] = useState("");
  const [expAccountId, setExpAccountId] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expFunding, setExpFunding] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetValue, setAssetValue] = useState("");
  const [credName, setCredName] = useState("");
  const [credPrincipal, setCredPrincipal] = useState("");
  const [credTotal, setCredTotal] = useState("");
  const [credRate, setCredRate] = useState("");
  const [credBorrowed, setCredBorrowed] = useState("");
  const [credDeadline, setCredDeadline] = useState("");
  const [showAddCreditor, setShowAddCreditor] = useState(false);
  const [interestPeriod, setInterestPeriod] = useState<"MONTHLY" | "YEARLY">("YEARLY");
  const [autoCalcTotal, setAutoCalcTotal] = useState(true);
  const [borrowReason, setBorrowReason] = useState("");
  const [editGoalId, setEditGoalId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [o, c, a, e, as] = await Promise.all([
        fetch("/api/finance/overview").then((r) => r.json()),
        fetch("/api/finance/creditors").then((r) => r.json()),
        fetch("/api/finance/accounts").then((r) => r.json()),
        fetch("/api/finance/expenses").then((r) => r.json()),
        fetch("/api/finance/assets").then((r) => r.json()),
      ]);
      if (o.error) throw new Error(o.error);
      setOverview(o);
      setCreditors(c.creditors || []);
      setAccounts(a.accounts || []);
      setExpenses(e.expenses || []);
      setAssets(as.assets || []);
      if (!payAccountId && a.accounts?.[0]) setPayAccountId(a.accounts[0].id);
      if (!expAccountId && a.accounts?.[0]) setExpAccountId(a.accounts[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load finance.");
    }
  }, [payAccountId, expAccountId]);

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("tab") as Tab | null;
      if (q && ["overview", "creditors", "accounts", "expenses", "assets"].includes(q)) {
        setTab(q);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function submitPay(e: FormEvent) {
    e.preventDefault();
    if (!payGoalId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/${payGoalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "PAYMENT",
          amount: Number(payAmount),
          moneyAccountId: payAccountId,
          paymentMethod: payMethod,
          note: payNote || null,
          fundingSourceNote: fundingNote || null,
          occurredAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed.");
      setPayGoalId(null);
      setPayAmount("");
      setFundingNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addAccount(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accName,
          kind: accKind,
          balance: Number(accBalance) || 0,
          currency: "KES",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add account.");
      setAccName("");
      setAccBalance("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add account.");
    } finally {
      setBusy(false);
    }
  }

  async function addExpense(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moneyAccountId: expAccountId,
          amount: Number(expAmount),
          category: expCategory || null,
          description: expDesc || null,
          fundingSourceNote: expFunding || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Expense rejected.");
      setExpAmount("");
      setExpDesc("");
      setExpFunding("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expense failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addAsset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: assetName,
          value: Number(assetValue) || 0,
          currency: "KES",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add asset.");
      setAssetName("");
      setAssetValue("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add asset.");
    } finally {
      setBusy(false);
    }
  }

  async function addCreditor(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const name = credName.trim();
      const principalNum = Number(String(credPrincipal).replace(/,/g, "").trim());
      if (!name) {
        throw new Error("Enter who you owe.");
      }
      if (!Number.isFinite(principalNum) || principalNum <= 0) {
        throw new Error("Enter a principal amount greater than zero.");
      }
      const res = await fetch("/api/finance/creditors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditorName: credName.trim(),
          principal: Number(String(credPrincipal).replace(/,/g, "").trim()),
          totalOwed: autoCalcTotal
            ? null
            : credTotal.trim()
              ? Number(String(credTotal).replace(/,/g, "").trim())
              : null,
          interestRate: credRate.trim()
            ? Number(String(credRate).replace(/,/g, "").trim())
            : null,
          interestPeriod,
          autoCalcTotal,
          borrowReason: borrowReason.trim() || null,
          borrowedAt: credBorrowed || null,
          deadline: credDeadline || null,
          currency: "KES",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add creditor.");
      setCredName("");
      setCredPrincipal("");
      setCredTotal("");
      setCredRate("");
      setCredBorrowed("");
      setCredDeadline("");
      setBorrowReason("");
      setInterestPeriod("YEARLY");
      setAutoCalcTotal(true);
      setEditGoalId(null);
      setShowAddCreditor(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add creditor.");
    } finally {
      setBusy(false);
    }
  }

  function fillFormFromCreditor(c: {
    goalId: string;
    creditorName: string;
    principal?: number | null;
    interestRate?: number | null;
    interestPeriod?: string;
    autoCalcTotal?: boolean;
    totalOwed: number;
    borrowReason?: string | null;
    borrowedAt?: string | null;
    deadline?: string | null;
  }) {
    setEditGoalId(c.goalId);
    setShowAddCreditor(true);
    setCredName(c.creditorName || "");
    setCredPrincipal(c.principal != null ? String(c.principal) : "");
    setCredTotal(String(c.totalOwed ?? ""));
    setCredRate(c.interestRate != null ? String(c.interestRate) : "");
    setInterestPeriod(
      c.interestPeriod === "MONTHLY" ? "MONTHLY" : "YEARLY",
    );
    setAutoCalcTotal(c.autoCalcTotal !== false);
    setBorrowReason(c.borrowReason || "");
    setCredBorrowed(
      c.borrowedAt ? String(c.borrowedAt).slice(0, 10) : "",
    );
    setCredDeadline(
      c.deadline ? String(c.deadline).slice(0, 10) : "",
    );
  }

  async function saveCreditorForm(e: FormEvent) {
    e.preventDefault();
    if (editGoalId) {
      setBusy(true);
      setError(null);
      try {
        const principalNum = Number(String(credPrincipal).replace(/,/g, "").trim());
        if (!credName.trim() || !Number.isFinite(principalNum) || principalNum <= 0) {
          throw new Error("Name and principal greater than zero are required.");
        }
        const res = await fetch(`/api/finance/creditors/${editGoalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creditorName: credName.trim(),
            principal: principalNum,
            totalOwed: autoCalcTotal
              ? null
              : credTotal.trim()
                ? Number(String(credTotal).replace(/,/g, "").trim())
                : null,
            interestRate: credRate.trim()
              ? Number(String(credRate).replace(/,/g, "").trim())
              : null,
            interestPeriod,
            autoCalcTotal,
            borrowReason: borrowReason.trim() || null,
            borrowedAt: credBorrowed || null,
            deadline: credDeadline || null,
            currency: "KES",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not update debt.");
        setEditGoalId(null);
        setShowAddCreditor(false);
        setCredName("");
        setCredPrincipal("");
        setCredTotal("");
        setCredRate("");
        setBorrowReason("");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update.");
      } finally {
        setBusy(false);
      }
      return;
    }
    await addCreditor(e);
  }

  return (
    <AppShell rightSlot={<UserButton />}>
      <MoodCanvas mood="goals">
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--achievement)]">
              Financial control
            </p>
            <h1 className="text-2xl font-semibold text-[var(--text)]">Finance hub</h1>
            <p className="text-sm text-secondary">
              Overview, creditors with Pay, money you hold, expenses, and assets —
              linked so payments cannot ignore available balances.
            </p>
            <Link href="/goals?filter=FINANCIAL" className="text-sm font-medium text-primary">
              ← Financial goals
            </Link>
          </header>

          <nav className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", t.id);
                    window.history.replaceState({}, "", url.toString());
                  } catch {
                    /* ignore */
                  }
                }}
                className={
                  tab === t.id
                    ? "rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-white"
                    : "rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text)]"
                }
              >
                {t.label}
              </button>
            ))}
          </nav>

          {error && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </p>
          )}

          {tab === "overview" && overview && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card p-4">
                <p className="text-xs uppercase text-secondary">Money I have</p>
                <p className="mt-1 text-xl font-semibold text-primary">
                  {money(overview.moneyAvailable)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs uppercase text-secondary">Total debt</p>
                <p className="mt-1 text-xl font-semibold text-[var(--text)]">
                  {money(overview.totalDebt)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs uppercase text-secondary">Assets</p>
                <p className="mt-1 text-xl font-semibold">{money(overview.assetsTotal)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs uppercase text-secondary">Expenses this month</p>
                <p className="mt-1 text-xl font-semibold">{money(overview.expensesThisMonth)}</p>
              </div>
              <div className="card p-4 sm:col-span-2">
                <p className="text-xs uppercase text-secondary">Approx. net (cash + assets − debt)</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--text)]">
                  {money(overview.netWorthApprox)}
                </p>
              </div>
            </div>
          )}

          {tab === "creditors" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-secondary max-w-xl">
                  List every person or institution you owe. Add as many as you need — total debt
                  is the sum of all balances. Use <strong>Pay</strong> on each row.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddCreditor((v) => !v)}
                  className="btn-primary rounded-full px-4 py-2 text-sm"
                >
                  {showAddCreditor ? "Close form" : "+ Add creditor"}
                </button>
              </div>

              {showAddCreditor && (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
                role="dialog"
                aria-modal="true"
                aria-labelledby="debt-form-title"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowAddCreditor(false);
                    setEditGoalId(null);
                  }
                }}
              >
                <form
                  onSubmit={saveCreditorForm}
                  className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p id="debt-form-title" className="text-sm font-semibold text-[var(--text)]">
                      {editGoalId ? "Edit debt record" : "New creditor"}
                    </p>
                    <button
                      type="button"
                      className="rounded-full px-2 text-lg leading-none text-secondary hover:bg-[var(--border)]"
                      aria-label="Close"
                      onClick={() => {
                        setShowAddCreditor(false);
                        setEditGoalId(null);
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-secondary sm:col-span-2">
                      Who I owe
                      <input
                        required
                        value={credName}
                        onChange={(e) => setCredName(e.target.value)}
                        className="input-field mt-1 w-full"
                        placeholder="Name, bank, SACCO, shop…"
                      />
                    </label>
                    <label className="text-xs text-secondary sm:col-span-2">
                      Reason for borrowing
                      <textarea
                        value={borrowReason}
                        onChange={(e) => setBorrowReason(e.target.value)}
                        rows={2}
                        className="input-field mt-1 w-full"
                        placeholder="Why was this money borrowed?"
                      />
                    </label>

                    <label className="text-xs text-secondary">
                      Principal (amount borrowed)
                      <input
                        required
                        type="number"
                        min={0}
                        step="0.01"
                        value={credPrincipal}
                        onChange={(e) => setCredPrincipal(e.target.value)}
                        className="input-field mt-1 w-full"
                        placeholder="Without interest"
                      />
                    </label>

                    <div className="text-xs text-secondary">
                      <span className="block">Interest period</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setInterestPeriod("MONTHLY")}
                          className={
                            interestPeriod === "MONTHLY"
                              ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                              : "rounded-full border border-[var(--border)] px-3 py-1.5 text-xs"
                          }
                        >
                          Monthly %
                        </button>
                        <button
                          type="button"
                          onClick={() => setInterestPeriod("YEARLY")}
                          className={
                            interestPeriod === "YEARLY"
                              ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                              : "rounded-full border border-[var(--border)] px-3 py-1.5 text-xs"
                          }
                        >
                          Yearly %
                        </button>
                      </div>
                    </div>

                    <label className="text-xs text-secondary">
                      Interest % ({interestPeriod === "MONTHLY" ? "per month" : "per year"})
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={credRate}
                        onChange={(e) => setCredRate(e.target.value)}
                        className="input-field mt-1 w-full"
                        placeholder="0 if none"
                      />
                    </label>

                    <label className="flex items-end gap-2 pb-2 text-sm text-[var(--text)]">
                      <input
                        type="checkbox"
                        checked={autoCalcTotal}
                        onChange={(e) => setAutoCalcTotal(e.target.checked)}
                      />
                      <span>
                        Auto total = principal + interest
                        <span className="block text-[0.65rem] text-muted">
                          Uncheck to type total owed manually
                        </span>
                      </span>
                    </label>

                    <label className="text-xs text-secondary sm:col-span-2">
                      Total owed (principal + interest)
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={
                          autoCalcTotal
                            ? (() => {
                                const p = Number(
                                  String(credPrincipal).replace(/,/g, "").trim(),
                                );
                                const r = Number(
                                  String(credRate).replace(/,/g, "").trim() || "0",
                                );
                                if (!Number.isFinite(p) || p <= 0) return "";
                                const total = totalFromPrincipalAndRate(
                                  p,
                                  r,
                                  true,
                                  null,
                                  {
                                    period: interestPeriod,
                                    borrowedAt: credBorrowed || null,
                                  },
                                );
                                return String(total);
                              })()
                            : credTotal
                        }
                        onChange={(e) => {
                          if (!autoCalcTotal) setCredTotal(e.target.value);
                        }}
                        readOnly={autoCalcTotal}
                        required={!autoCalcTotal}
                        className={`input-field mt-1 w-full ${autoCalcTotal ? "bg-[var(--border)]/40" : ""}`}
                        placeholder={
                          autoCalcTotal
                            ? "Calculated from principal + interest"
                            : "Enter total including interest"
                        }
                      />
                      <span className="mt-1 block text-[0.65rem] text-muted">
                        {autoCalcTotal
                          ? `Simple interest over unpaid time: principal + (rate × ${interestPeriod === "MONTHLY" ? "months" : "years"} since “when borrowed”). ${credBorrowed ? unpaidPeriodLabel(credBorrowed, interestPeriod) + "." : "Set “when borrowed” so months/years are counted."} Example: 10% monthly for 4 months → interest = 40% of principal.`
                          : "Enter the full amount you must repay. Principal above stays the original borrow amount."}
                      </span>
                    </label>

                    <label className="text-xs text-secondary">
                      When borrowed
                      <input
                        type="date"
                        value={credBorrowed}
                        onChange={(e) => setCredBorrowed(e.target.value)}
                        className="input-field mt-1 w-full"
                      />
                    </label>
                    <label className="text-xs text-secondary">
                      Payment deadline
                      <input
                        type="date"
                        value={credDeadline}
                        onChange={(e) => setCredDeadline(e.target.value)}
                        className="input-field mt-1 w-full"
                      />
                      <span className="mt-1 block text-[0.65rem] text-muted">
                        Your target finish date or the lender’s due date.
                      </span>
                    </label>
                  </div>

                  <div className="sm:col-span-2 flex gap-2">
                    <button type="submit" disabled={busy} className="btn-primary">
                      {busy ? "Saving…" : editGoalId ? "Update debt" : "Save creditor"}
                    </button>
                  </div>
                
                </form>
              </div>
            )}

              {creditors.length === 0 && !showAddCreditor ? (
                <p className="text-sm text-secondary">
                  No creditors yet. Click <strong>+ Add creditor</strong> to record the first debt.
                </p>
              ) : creditors.length === 0 ? null : (
                <ul className="space-y-2">
                  {creditors.map((c) => (
                    <li
                      key={c.goalId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-[var(--text)]">{c.creditorName}</p>
                        <p className="text-xs text-secondary">{c.goalTitle}</p>
                        {"borrowReason" in c && (c as { borrowReason?: string }).borrowReason && (
                          <p className="mt-1 text-xs text-secondary line-clamp-2">
                            {(c as { borrowReason?: string }).borrowReason}
                          </p>
                        )}
                        <p className="mt-1 text-sm">
                          Balance{" "}
                          <span className="font-semibold text-primary">
                            {money(c.balance, c.currency)}
                          </span>
                          <span className="text-secondary">
                            {" "}
                            · paid {money(c.amountPaid, c.currency)} of{" "}
                            {money(c.totalOwed, c.currency)}
                          </span>
                        </p>
                        {(() => {
                          const p = repaymentProgress({
                            totalOwed: c.totalOwed,
                            amountPaid: c.amountPaid,
                            balance: c.balance,
                            deadline: c.deadline,
                            start: (c as { borrowedAt?: string }).borrowedAt,
                          });
                          return (
                            <div className="mt-2 max-w-md space-y-1">
                              <div className="flex justify-between text-[0.7rem] text-secondary">
                                <span>{p.pctPaid}% repaid</span>
                                <span>{p.remainingLabel}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${p.pctPaid}%` }}
                                />
                              </div>
                              {p.scheduleHint && (
                                <p className="text-[0.65rem] text-muted">{p.scheduleHint}</p>
                              )}
                              {!p.onTrack && p.balance > 0 && c.deadline && (
                                <p className="text-[0.65rem] text-amber-700">
                                  Behind schedule vs time elapsed — consider a higher payment.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/goals/${c.goalId}`}
                          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium"
                        >
                          Open goal
                        </Link>
                        <button
                          type="button"
                          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium"
                          onClick={() => fillFormFromCreditor(c as never)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-primary rounded-full px-4 py-1.5 text-xs"
                          onClick={() => {
                            setPayGoalId(c.goalId);
                            setPayAmount(String(c.balance || ""));
                          }}
                        >
                          Pay
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {payGoalId && (
                <form
                  onSubmit={submitPay}
                  className="card space-y-3 border-2 border-primary/30 p-4"
                >
                  <p className="font-semibold">Pay this creditor</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs text-secondary">
                      Amount
                      <input
                        required
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="input-field mt-1 w-full"
                      />
                    </label>
                    <label className="text-xs text-secondary">
                      From account
                      <select
                        required
                        value={payAccountId}
                        onChange={(e) => setPayAccountId(e.target.value)}
                        className="input-field mt-1 w-full"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({money(a.balance, a.currency)})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-secondary">
                      Mode
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="input-field mt-1 w-full"
                      >
                        {["M-Pesa", "Bank transfer", "Cash", "Card", "Other"].map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-secondary">
                      Note
                      <input
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        className="input-field mt-1 w-full"
                      />
                    </label>
                    <label className="text-xs text-secondary sm:col-span-2">
                      If amount &gt; account balance — where did the money come from?
                      <input
                        value={fundingNote}
                        onChange={(e) => setFundingNote(e.target.value)}
                        className="input-field mt-1 w-full"
                        placeholder="Required only when paying more than the account holds"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy || !accounts.length} className="btn-primary">
                      Confirm payment
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setPayGoalId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                  {!accounts.length && (
                    <p className="text-xs text-secondary">
                      Add money under <strong>Money I have</strong> first.
                    </p>
                  )}
                </form>
              )}
            </div>
          )}

          {tab === "accounts" && (
            <div className="space-y-4">
              <form onSubmit={addAccount} className="card grid gap-2 p-4 sm:grid-cols-4">
                <input
                  required
                  placeholder="Account name"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="input-field sm:col-span-2"
                />
                <select
                  value={accKind}
                  onChange={(e) => setAccKind(e.target.value)}
                  className="input-field"
                >
                  {["MPESA", "BANK", "CASH", "OTHER"].map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Balance"
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value)}
                  className="input-field"
                />
                <button type="submit" disabled={busy} className="btn-primary sm:col-span-4">
                  Add account
                </button>
              </form>
              <ul className="space-y-2">
                {accounts.map((a) => (
                  <li
                    key={a.id}
                    className="flex justify-between rounded-xl border border-[var(--border)] px-4 py-3"
                  >
                    <span>
                      {a.name}{" "}
                      <span className="text-xs text-secondary">({a.kind})</span>
                    </span>
                    <span className="font-semibold">{money(a.balance, a.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "expenses" && (
            <div className="space-y-4">
              <form onSubmit={addExpense} className="card grid gap-2 p-4 sm:grid-cols-2">
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0.01}
                  placeholder="Amount"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="input-field"
                />
                <select
                  required
                  value={expAccountId}
                  onChange={(e) => setExpAccountId(e.target.value)}
                  className="input-field"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({money(a.balance, a.currency)})
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Category"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="input-field"
                />
                <input
                  placeholder="Description"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="input-field"
                />
                <input
                  placeholder="If over balance: where did money come from?"
                  value={expFunding}
                  onChange={(e) => setExpFunding(e.target.value)}
                  className="input-field sm:col-span-2"
                />
                <button type="submit" disabled={busy || !accounts.length} className="btn-primary sm:col-span-2">
                  Record expense
                </button>
              </form>
              <ul className="space-y-2">
                {expenses.map((x) => (
                  <li
                    key={x.id}
                    className="flex justify-between gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
                  >
                    <span>
                      {x.description || x.category || "Expense"} · {x.moneyAccount.name}
                    </span>
                    <span className="font-medium">{money(x.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "assets" && (
            <div className="space-y-4">
              <form onSubmit={addAsset} className="card grid gap-2 p-4 sm:grid-cols-3">
                <input
                  required
                  placeholder="Asset name"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="input-field sm:col-span-2"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Value"
                  value={assetValue}
                  onChange={(e) => setAssetValue(e.target.value)}
                  className="input-field"
                />
                <button type="submit" disabled={busy} className="btn-primary sm:col-span-3">
                  Add asset
                </button>
              </form>
              <ul className="space-y-2">
                {assets.map((a) => (
                  <li
                    key={a.id}
                    className="flex justify-between rounded-xl border border-[var(--border)] px-4 py-3"
                  >
                    <span>{a.name}</span>
                    <span className="font-semibold">{money(a.value, a.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </MoodCanvas>
    </AppShell>
  );
}
