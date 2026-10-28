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
import {
  SavingsPanel,
  BudgetsPanel,
  DebtorsPanel,
  ExpenseCategoryPicker,
} from "@/components/finance/SavingsBudgetTabs";

type Tab = "overview" | "creditors" | "debtors" | "savings" | "budgets" | "accounts" | "expenses" | "assets";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "creditors", label: "Creditors" },
  { id: "debtors", label: "Debtors" },
  { id: "savings", label: "Savings" },
  { id: "budgets", label: "Budgets" },
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
    totalReceivable?: number;
    debtorsCount?: number;
    assetsTotal: number;
    totalDebt: number;
    liquidPosition?: number;
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
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [topUpAccountId, setTopUpAccountId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpSource, setTopUpSource] = useState("");
  const [topUpPurpose, setTopUpPurpose] = useState("");
  const [topUpDate, setTopUpDate] = useState("");
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editAccName, setEditAccName] = useState("");
  const [editAccKind, setEditAccKind] = useState("CASH");
  const [editAccNotes, setEditAccNotes] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
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
      if (q && ["overview", "creditors", "debtors", "savings", "budgets", "accounts", "expenses", "assets"].includes(q)) {
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


  async function submitTopUp(e: FormEvent) {
    e.preventDefault();
    if (!topUpAccountId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "topup",
          accountId: topUpAccountId,
          amount: Number(topUpAmount),
          source: topUpSource.trim() || null,
          purpose: topUpPurpose.trim() || null,
          occurredAt: topUpDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Top-up failed.");
      setTopUpAccountId(null);
      setTopUpAmount("");
      setTopUpSource("");
      setTopUpPurpose("");
      setTopUpDate("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEditAccount(e: FormEvent) {
    e.preventDefault();
    if (!editAccountId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/accounts/${editAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editAccName.trim(),
          kind: editAccKind,
          notes: editAccNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update account.");
      setEditAccountId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(id: string, name: string) {
    if (!confirm(`Delete account "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/accounts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete account.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account.");
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
            <p className="text-sm text-secondary max-w-2xl">
              Totals, surplus or deficit, and clear tables for every section — so you can read
              your position at a glance and act with confidence.
            </p>
            <Link href="/goals?filter=FINANCIAL" className="text-sm font-medium text-primary">
              ← Financial goals
            </Link>
          </header>

          <nav className="-mx-1 flex gap-2 overflow-x-auto border-b border-[var(--border)] px-1 pb-3 scrollbar-thin">
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
                    ? "shrink-0 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white"
                    : "shrink-0 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)]"
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
            <div className="space-y-6">
              {(() => {
                const cash = overview.moneyAvailable;
                const receivable = overview.totalReceivable ?? 0;
                const debt = overview.totalDebt;
                const myMoney = cash + receivable;
                const liquid =
                  overview.liquidPosition ?? cash + receivable - debt;
                const exp = overview.expensesThisMonth;
                const assets = overview.assetsTotal;
                const net = overview.netWorthApprox;
                const debtorsN = overview.debtorsCount ?? 0;
                return (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                          Cash available
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                          {money(cash)}
                        </p>
                        <p className="mt-1 text-xs text-secondary">Accounts</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                          Owed to me (debtors)
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-emerald-800">
                          {money(receivable)}
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                          {debtorsN === 0
                            ? "No open debtors"
                            : `${debtorsN} debtor${debtorsN === 1 ? "" : "s"}`}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                          Total debt (creditors)
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-red-700">
                          {money(debt)}
                        </p>
                        <p className="mt-1 text-xs text-secondary">What I owe</p>
                      </div>
                      <div
                        className={
                          "rounded-2xl border p-5 shadow-sm " +
                          (liquid >= 0
                            ? "border-emerald-200 bg-emerald-50/80"
                            : "border-amber-200 bg-amber-50/80")
                        }
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                          {liquid >= 0 ? "Position (my money − debt)" : "Shortfall"}
                        </p>
                        <p
                          className={
                            "mt-2 text-2xl font-semibold " +
                            (liquid >= 0 ? "text-emerald-800" : "text-amber-900")
                          }
                        >
                          {money(Math.abs(liquid))}
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                          Cash + owed to me − creditors
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                      <table className="w-full min-w-[32rem] text-left text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--background)] text-xs uppercase tracking-wide text-secondary">
                            <th className="px-4 py-3 font-semibold">Metric</th>
                            <th className="px-4 py-3 font-semibold text-right">Amount</th>
                            <th className="px-4 py-3 font-semibold">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          <tr>
                            <td className="px-4 py-3 font-medium">Cash (accounts)</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {money(cash)}
                            </td>
                            <td className="px-4 py-3 text-secondary">Liquid accounts</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium">Owed to me</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                              {money(receivable)}
                            </td>
                            <td className="px-4 py-3 text-secondary">Debtors balances</td>
                          </tr>
                          <tr className="bg-[var(--background)]/40">
                            <td className="px-4 py-3 font-semibold">My money (cash + debtors)</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {money(myMoney)}
                            </td>
                            <td className="px-4 py-3 text-secondary">What is mine</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium">I owe (creditors)</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-700">
                              {money(debt)}
                            </td>
                            <td className="px-4 py-3 text-secondary">Outstanding balances</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium">Position</td>
                            <td
                              className={
                                "px-4 py-3 text-right font-semibold tabular-nums " +
                                (liquid >= 0 ? "text-emerald-700" : "text-amber-800")
                              }
                            >
                              {money(liquid)}
                            </td>
                            <td className="px-4 py-3 text-secondary">My money − debt</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium">Expenses this month</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {money(exp)}
                            </td>
                            <td className="px-4 py-3 text-secondary">Recorded spend</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium">Assets</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {money(assets)}
                            </td>
                            <td className="px-4 py-3 text-secondary">Property, vehicles, etc.</td>
                          </tr>
                          <tr className="bg-[var(--background)]/60">
                            <td className="px-4 py-3 font-semibold">Approx. net worth</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {money(net)}
                            </td>
                            <td className="px-4 py-3 text-secondary">
                              Cash + debtors + assets − creditors
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => setTab("debtors")}
                        className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-left text-sm hover:border-emerald-400"
                      >
                        <span className="font-semibold text-emerald-800">Debtors →</span>
                        <span className="mt-1 block text-xs text-secondary">
                          {money(receivable)} owed to me
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("creditors")}
                        className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left text-sm hover:border-primary/40"
                      >
                        <span className="font-semibold text-[var(--text)]">Creditors →</span>
                        <span className="mt-1 block text-xs text-secondary">
                          {money(debt)} outstanding
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("expenses")}
                        className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left text-sm hover:border-primary/40"
                      >
                        <span className="font-semibold text-[var(--text)]">Expenses →</span>
                        <span className="mt-1 block text-xs text-secondary">
                          {money(exp)} this month
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("savings")}
                        className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left text-sm hover:border-primary/40"
                      >
                        <span className="font-semibold text-[var(--text)]">Savings →</span>
                        <span className="mt-1 block text-xs text-secondary">Goals & progress</span>
                      </button>
                    </div>
                  </>
                );
              })()}
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
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                      <p className="text-[0.65rem] uppercase text-secondary">Creditors</p>
                      <p className="text-lg font-semibold">{creditors.length}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                      <p className="text-[0.65rem] uppercase text-secondary">Total owed</p>
                      <p className="text-lg font-semibold text-red-700">
                        {money(creditors.reduce((s, c) => s + (c.totalOwed || 0), 0))}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                      <p className="text-[0.65rem] uppercase text-secondary">Total balance</p>
                      <p className="text-lg font-semibold text-primary">
                        {money(creditors.reduce((s, c) => s + (c.balance || 0), 0))}
                      </p>
                    </div>
                  </div>
                  <div className="-mx-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm sm:mx-0">
                    <table className="w-full min-w-[48rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--background)] text-xs uppercase tracking-wide text-secondary">
                          <th className="px-3 py-3 font-semibold">Creditor</th>
                          <th className="px-3 py-3 font-semibold text-right">Total owed</th>
                          <th className="px-3 py-3 font-semibold text-right">Paid</th>
                          <th className="px-3 py-3 font-semibold text-right">Balance</th>
                          <th className="px-3 py-3 font-semibold">Progress</th>
                          <th className="px-3 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {creditors.map((c) => {
                          const p = repaymentProgress({
                            totalOwed: c.totalOwed,
                            amountPaid: c.amountPaid,
                            balance: c.balance,
                            deadline: c.deadline,
                            start: (c as { borrowedAt?: string }).borrowedAt,
                          });
                          return (
                            <tr key={c.goalId} className="align-top hover:bg-[var(--background)]/50">
                              <td className="px-3 py-3">
                                <p className="font-semibold text-[var(--text)]">{c.creditorName}</p>
                                <p className="text-xs text-secondary">{c.goalTitle}</p>
                                {"borrowReason" in c &&
                                  (c as { borrowReason?: string }).borrowReason && (
                                    <p className="mt-0.5 line-clamp-1 text-xs text-secondary">
                                      {(c as { borrowReason?: string }).borrowReason}
                                    </p>
                                  )}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums">
                                {money(c.totalOwed, c.currency)}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-secondary">
                                {money(c.amountPaid, c.currency)}
                              </td>
                              <td className="px-3 py-3 text-right font-semibold tabular-nums text-primary">
                                {money(c.balance, c.currency)}
                              </td>
                              <td className="px-3 py-3 min-w-[8rem]">
                                <div className="flex justify-between text-[0.65rem] text-secondary">
                                  <span>{p.pctPaid}%</span>
                                  <span>{p.remainingLabel}</span>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${p.pctPaid}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    className="btn-primary rounded-full px-3 py-1 text-xs"
                                    onClick={() => {
                                      setPayGoalId(c.goalId);
                                      setPayAmount(String(c.balance || ""));
                                    }}
                                  >
                                    Pay
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs"
                                    onClick={() => fillFormFromCreditor(c as never)}
                                  >
                                    Edit
                                  </button>
                                  <Link
                                    href={`/goals/${c.goalId}`}
                                    className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs"
                                  >
                                    Goal
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-[var(--border)] bg-[var(--background)] font-semibold">
                          <td className="px-3 py-3">Totals</td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {money(creditors.reduce((s, c) => s + (c.totalOwed || 0), 0))}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {money(creditors.reduce((s, c) => s + (c.amountPaid || 0), 0))}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-primary">
                            {money(creditors.reduce((s, c) => s + (c.balance || 0), 0))}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
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

          {tab === "debtors" && <DebtorsPanel />}

          {tab === "savings" && <SavingsPanel />}

          {tab === "budgets" && <BudgetsPanel />}

          {tab === "accounts" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text)]">Money I have</h2>
                  <p className="text-xs text-secondary sm:text-sm">
                    Create each account once. Use <strong>Top up</strong> when money comes in —
                    with date, source and purpose.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAccount((v) => !v)}
                  className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white"
                >
                  {showAddAccount ? "Close" : "+ New account"}
                </button>
              </div>

              {showAddAccount && (
                <form
                  onSubmit={async (e) => {
                    await addAccount(e);
                    setShowAddAccount(false);
                    setAccName("");
                    setAccBalance("");
                  }}
                  className="card grid gap-3 p-4 sm:grid-cols-2"
                >
                  <label className="text-sm font-medium sm:col-span-2">
                    Account name
                    <input
                      required
                      placeholder="e.g. M-Pesa, Equity Bank, Cash wallet"
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      className="input-field mt-1.5 w-full"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Opening balance (optional)
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0"
                      value={accBalance}
                      onChange={(e) => setAccBalance(e.target.value)}
                      className="input-field mt-1.5 w-full"
                    />
                  </label>
                  <div className="flex items-end">
                    <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
                      Create account
                    </button>
                  </div>
                </form>
              )}

              {topUpAccountId && (
                <form
                  onSubmit={submitTopUp}
                  className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:grid-cols-2"
                >
                  <p className="text-sm font-semibold sm:col-span-2">
                    Top up —{" "}
                    {accounts.find((a) => a.id === topUpAccountId)?.name || "account"}
                  </p>
                  <label className="text-sm font-medium">
                    Amount *
                    <input
                      required
                      type="number"
                      min={0.01}
                      step="any"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="input-field mt-1.5 w-full"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Date received
                    <input
                      type="date"
                      value={topUpDate}
                      onChange={(e) => setTopUpDate(e.target.value)}
                      className="input-field mt-1.5 w-full"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Where from (source)
                    <input
                      value={topUpSource}
                      onChange={(e) => setTopUpSource(e.target.value)}
                      placeholder="Salary, client, gift, transfer…"
                      className="input-field mt-1.5 w-full"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Purpose
                    <input
                      value={topUpPurpose}
                      onChange={(e) => setTopUpPurpose(e.target.value)}
                      placeholder="Living costs, savings, project…"
                      className="input-field mt-1.5 w-full"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
                      {busy ? "Saving…" : "Confirm top up"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setTopUpAccountId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {editAccountId && (
                <form
                  onSubmit={saveEditAccount}
                  className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2"
                >
                  <p className="text-sm font-semibold sm:col-span-2">Edit account</p>
                  <label className="text-sm font-medium">
                    Name
                    <input
                      required
                      value={editAccName}
                      onChange={(e) => setEditAccName(e.target.value)}
                      className="input-field mt-1.5 w-full"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Type
                    <select
                      value={editAccKind}
                      onChange={(e) => setEditAccKind(e.target.value)}
                      className="input-field mt-1.5 w-full"
                    >
                      {["CASH", "BANK", "MPESA", "SACCO", "OTHER"].map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    Notes
                    <input
                      value={editAccNotes}
                      onChange={(e) => setEditAccNotes(e.target.value)}
                      className="input-field mt-1.5 w-full"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
                      Save changes
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setEditAccountId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {accounts.length === 0 && !showAddAccount ? (
                <p className="text-sm text-secondary">
                  No accounts yet. Create M-Pesa, bank or cash once, then top up when money arrives.
                </p>
              ) : accounts.length === 0 ? null : (
                <div className="-mx-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm sm:mx-0">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)] text-xs uppercase text-secondary">
                        <th className="px-4 py-3 font-semibold">Account</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold text-right">Balance</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {accounts.map((a) => (
                        <tr key={a.id} className="hover:bg-[var(--background)]/50">
                          <td className="px-4 py-3 font-medium">{a.name}</td>
                          <td className="px-4 py-3 text-secondary">{a.kind}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {money(a.balance, a.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                                onClick={() => {
                                  setTopUpAccountId(a.id);
                                  setTopUpDate(new Date().toISOString().slice(0, 10));
                                  setEditAccountId(null);
                                }}
                              >
                                Top up
                              </button>
                              <button
                                type="button"
                                className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs"
                                onClick={() => {
                                  setEditAccountId(a.id);
                                  setEditAccName(a.name);
                                  setEditAccKind(a.kind || "CASH");
                                  setEditAccNotes("");
                                  setTopUpAccountId(null);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="rounded-full border border-red-200 px-2.5 py-1 text-xs text-red-700"
                                onClick={() => void deleteAccount(a.id, a.name)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[var(--border)] bg-[var(--background)] font-semibold">
                        <td className="px-4 py-3" colSpan={2}>
                          Total cash
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {money(accounts.reduce((s, a) => s + (a.balance || 0), 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "expenses" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text)]">Expenses</h2>
                  <p className="text-xs text-secondary">Track spending by category and account.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddExpense((v) => !v)}
                  className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white"
                >
                  {showAddExpense ? "Close" : "+ Record expense"}
                </button>
              </div>
              {showAddExpense && (
                <form onSubmit={async (e) => { await addExpense(e); setShowAddExpense(false); }} className="card grid gap-2 p-4 sm:grid-cols-2">
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
                  <div className="sm:col-span-2">
                    <ExpenseCategoryPicker
                      value={expCategory}
                      onChange={setExpCategory}
                    />
                  </div>
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
                    className="input-field"
                  />
                  <button type="submit" disabled={busy || !accounts.length} className="btn-primary sm:col-span-2">
                    Save expense
                  </button>
                </form>
              )}
              {expenses.length === 0 && !showAddExpense ? (
                <p className="text-sm text-secondary">
                  No expenses yet. Click <strong>+ Record expense</strong> to add one.
                </p>
              ) : expenses.length === 0 ? null : (
                <div className="-mx-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm sm:mx-0">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)] text-xs uppercase text-secondary">
                        <th className="px-4 py-3 font-semibold">Description</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold">Account</th>
                        <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {expenses.map((x) => (
                        <tr key={x.id} className="hover:bg-[var(--background)]/50">
                          <td className="px-4 py-3">{x.description || "—"}</td>
                          <td className="px-4 py-3 text-secondary">{x.category || "—"}</td>
                          <td className="px-4 py-3 text-secondary">{x.moneyAccount.name}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {money(x.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[var(--border)] bg-[var(--background)] font-semibold">
                        <td className="px-4 py-3" colSpan={3}>
                          Total (shown)
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {money(expenses.reduce((s, x) => s + (x.amount || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "assets" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text)]">Assets</h2>
                  <p className="text-xs text-secondary">Property, vehicles, equipment and other value.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAsset((v) => !v)}
                  className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white"
                >
                  {showAddAsset ? "Close" : "+ Add asset"}
                </button>
              </div>
              {showAddAsset && (
                <form onSubmit={async (e) => { await addAsset(e); setShowAddAsset(false); }} className="card grid gap-2 p-4 sm:grid-cols-3">
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
                    Save asset
                  </button>
                </form>
              )}
              {assets.length === 0 && !showAddAsset ? (
                <p className="text-sm text-secondary">
                  No assets yet. Click <strong>+ Add asset</strong> to add one.
                </p>
              ) : assets.length === 0 ? null : (
                <div className="-mx-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm sm:mx-0">
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)] text-xs uppercase text-secondary">
                        <th className="px-4 py-3 font-semibold">Asset</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {assets.map((a) => (
                        <tr key={a.id} className="hover:bg-[var(--background)]/50">
                          <td className="px-4 py-3 font-medium">{a.name}</td>
                          <td className="px-4 py-3 text-secondary">{a.category || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {money(a.value, a.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[var(--border)] bg-[var(--background)] font-semibold">
                        <td className="px-4 py-3" colSpan={2}>
                          Total assets
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {money(assets.reduce((s, a) => s + (a.value || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </MoodCanvas>
    </AppShell>
  );
}
