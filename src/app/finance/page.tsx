"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
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
                onClick={() => setTab(t.id)}
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
              <p className="text-sm text-secondary">
                Everyone you still owe. Use <strong>Pay</strong> to clear part or all from an
                account — balance updates and the account is debited.
              </p>
              {creditors.length === 0 ? (
                <p className="text-sm text-secondary">
                  No open debts. Create a Financial goal as Debt free to add a creditor.
                </p>
              ) : (
                <ul className="space-y-2">
                  {creditors.map((c) => (
                    <li
                      key={c.goalId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-[var(--text)]">{c.creditorName}</p>
                        <p className="text-xs text-secondary">{c.goalTitle}</p>
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
