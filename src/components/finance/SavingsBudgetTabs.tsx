"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { SAVINGS_PURPOSES } from "@/lib/expense-categories";

function money(n: number, currency = "KES") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

type SavingsRow = {
  goalId: string;
  title: string;
  purpose: string | null;
  purposeLabel: string | null;
  targetAmount: number;
  savedAmount: number;
  balance: number;
  currency: string;
  savingsDestination: string | null;
};

type BudgetRow = {
  id: string;
  period: string;
  periodStart: string;
  amount: number;
  currency: string;
  category: string | null;
  notes: string | null;
};

export function SavingsPanel() {
  type Row = {
    goalId: string;
    title: string;
    purpose: string | null;
    purposeLabel: string | null;
    targetAmount: number;
    savedAmount: number;
    balance: number;
    currency: string;
    savingsDestination: string | null;
  };

  type Account = { id: string; name: string; balance: number; currency: string };

  const [rows, setRows] = useState<Row[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [purpose, setPurpose] = useState("EMERGENCY");
  const [purposeLabel, setPurposeLabel] = useState("");
  const [target, setTarget] = useState("");
  const [dest, setDest] = useState("");
  const [currency, setCurrency] = useState("KES");

  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [contribAccountId, setContribAccountId] = useState("");
  const [contribDate, setContribDate] = useState("");
  const [contribNote, setContribNote] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        fetch("/api/finance/savings"),
        fetch("/api/finance/accounts"),
      ]);
      const sData = await sRes.json();
      const aData = await aRes.json();
      setRows(sData.savings || []);
      const accs = aData.accounts || [];
      setAccounts(accs);
      if (!contribAccountId && accs[0]) setContribAccountId(accs[0].id);
    } catch {
      setError("Could not load savings.");
    }
  }, [contribAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          purposeLabel: purpose === "CUSTOM" ? purposeLabel : undefined,
          targetAmount: Number(target),
          currency,
          savingsDestination: dest || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShow(false);
      setTarget("");
      setDest("");
      setPurposeLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onContribute(e: FormEvent) {
    e.preventDefault();
    if (!contributeGoalId) return;
    setBusy(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/finance/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "contribute",
          goalId: contributeGoalId,
          moneyAccountId: contribAccountId,
          amount: Number(contribAmount),
          occurredAt: contribDate || null,
          note: contribNote || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Contribution failed.");
      setSuccessMsg(
        data.message ||
          "Contribution saved as a transfer — not an expense. Money is still yours.",
      );
      setContributeGoalId(null);
      setContribAmount("");
      setContribNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Contribution failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Savings goals</h2>
          <p className="text-xs text-secondary sm:text-sm">
            Contribute from an account as a <strong>transfer</strong> — not an expense.
            Cash goes down; savings progress goes up; net worth stays the same.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white"
        >
          {show ? "Close" : "+ New savings goal"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {successMsg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {successMsg}
        </p>
      )}

      {show && (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2"
        >
          <label className="text-sm font-medium">
            Purpose
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="input-field mt-1.5 w-full"
            >
              {SAVINGS_PURPOSES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {purpose === "CUSTOM" && (
            <label className="text-sm font-medium">
              Custom purpose
              <input
                required
                value={purposeLabel}
                onChange={(e) => setPurposeLabel(e.target.value)}
                className="input-field mt-1.5 w-full"
              />
            </label>
          )}
          <label className="text-sm font-medium">
            Target amount
            <input
              required
              type="number"
              min={0}
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium">
            Where you keep it
            <input
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              placeholder="Bank, SACCO, jar…"
              className="input-field mt-1.5 w-full"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
              Create savings goal
            </button>
          </div>
        </form>
      )}

      {contributeGoalId && (
        <form
          onSubmit={onContribute}
          className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:grid-cols-2"
        >
          <p className="text-sm font-semibold sm:col-span-2">
            Contribute to{" "}
            {rows.find((r) => r.goalId === contributeGoalId)?.title || "savings"}
          </p>
          <p className="text-xs text-secondary sm:col-span-2">
            This debits the selected account and increases savings progress. It does{" "}
            <strong>not</strong> create an expense.
          </p>
          <label className="text-sm font-medium">
            Amount *
            <input
              required
              type="number"
              min={0.01}
              step="any"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium">
            From account *
            <select
              required
              value={contribAccountId}
              onChange={(e) => setContribAccountId(e.target.value)}
              className="input-field mt-1.5 w-full"
            >
              {accounts.length === 0 ? (
                <option value="">No accounts — top up first</option>
              ) : (
                accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.balance.toLocaleString()} {a.currency})
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="text-sm font-medium">
            Date
            <input
              type="date"
              value={contribDate}
              onChange={(e) => setContribDate(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium">
            Note
            <input
              value={contribNote}
              onChange={(e) => setContribNote(e.target.value)}
              className="input-field mt-1.5 w-full"
              placeholder="Optional"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={busy || !accounts.length}
              className="btn-primary disabled:opacity-50"
            >
              {busy ? "Saving…" : "Confirm contribution"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setContributeGoalId(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-secondary">
          No savings goals yet. Add emergency fund, fees, or any custom target.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
              <p className="text-[0.65rem] uppercase text-secondary">Goals</p>
              <p className="text-lg font-semibold">{rows.length}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
              <p className="text-[0.65rem] uppercase text-secondary">Saved</p>
              <p className="text-lg font-semibold text-emerald-700">
                {money(rows.reduce((s, r) => s + r.savedAmount, 0))}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
              <p className="text-[0.65rem] uppercase text-secondary">Still to save</p>
              <p className="text-lg font-semibold">
                {money(rows.reduce((s, r) => s + r.balance, 0))}
              </p>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => {
              const pct =
                r.targetAmount > 0
                  ? Math.min(100, Math.round((r.savedAmount / r.targetAmount) * 100))
                  : 0;
              return (
                <li
                  key={r.goalId}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                >
                  <p className="font-semibold text-[var(--text)]">{r.title}</p>
                  <p className="text-xs text-secondary">
                    {r.purposeLabel || r.purpose || "Savings"}
                    {r.savingsDestination ? ` · ${r.savingsDestination}` : ""}
                  </p>
                  <p className="mt-2 text-sm">
                    {money(r.savedAmount, r.currency)} / {money(r.targetAmount, r.currency)}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full bg-[var(--secondary)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary mt-3 w-full rounded-full py-2 text-xs"
                    onClick={() => {
                      setContributeGoalId(r.goalId);
                      setContribAmount("");
                      setContribDate(new Date().toISOString().slice(0, 10));
                      setSuccessMsg(null);
                    }}
                  >
                    Contribute
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm md:block">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)] text-xs uppercase text-secondary">
                  <th className="px-4 py-3 font-semibold">Goal</th>
                  <th className="px-4 py-3 font-semibold text-right">Saved</th>
                  <th className="px-4 py-3 font-semibold text-right">Target</th>
                  <th className="px-4 py-3 font-semibold text-right">Remaining</th>
                  <th className="px-4 py-3 font-semibold">Progress</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((r) => {
                  const pct =
                    r.targetAmount > 0
                      ? Math.min(100, Math.round((r.savedAmount / r.targetAmount) * 100))
                      : 0;
                  return (
                    <tr key={r.goalId} className="hover:bg-[var(--background)]/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-secondary">
                          {r.purposeLabel || r.purpose || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                        {money(r.savedAmount, r.currency)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(r.targetAmount, r.currency)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(r.balance, r.currency)}
                      </td>
                      <td className="px-4 py-3 min-w-[7rem]">
                        <span className="text-xs text-secondary">{pct}%</span>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full bg-[var(--secondary)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                          onClick={() => {
                            setContributeGoalId(r.goalId);
                            setContribAmount("");
                            setContribDate(new Date().toISOString().slice(0, 10));
                            setSuccessMsg(null);
                          }}
                        >
                          Contribute
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function BudgetsPanel() {
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [period, setPeriod] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("MONTHLY");
  const [periodStart, setPeriodStart] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("KES");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/budgets");
      const data = await res.json();
      setRows(data.budgets || []);
    } catch {
      setError("Could not load budgets.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          periodStart: periodStart || new Date().toISOString().slice(0, 10),
          amount: Number(amount),
          currency,
          category: category || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShow(false);
      setAmount("");
      setCategory("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Budgets</h2>
          <p className="text-xs text-secondary sm:text-sm">
            Daily, weekly, or monthly limits. Totals show your expected money for each period.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white"
        >
          {show ? "Close" : "+ Set budget"}
        </button>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(["MONTHLY", "WEEKLY", "DAILY"] as const).map((p) => {
            const sum = rows
              .filter((b) => b.period === p)
              .reduce((s, b) => s + (b.amount || 0), 0);
            const count = rows.filter((b) => b.period === p).length;
            return (
              <div
                key={p}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-secondary">
                  Total {p.toLowerCase()} budgets
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text)]">
                  {money(sum)}
                </p>
                <p className="mt-0.5 text-xs text-secondary">
                  {count === 0
                    ? "None set"
                    : `${count} budget${count === 1 ? "" : "s"} · expected envelope`}
                </p>
              </div>
            );
          })}
        </div>
      )}


      {show && (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2"
        >
          <label className="text-sm font-medium">
            Period
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "DAILY" | "WEEKLY" | "MONTHLY")}
              className="input-field mt-1.5 w-full"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Period start
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium">
            Budget amount
            <input
              required
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium">
            Currency
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Category (optional — leave blank for overall budget)
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Food & groceries"
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Notes
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
              {busy ? "Saving…" : "Save budget"}
            </button>
          </div>
        </form>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-secondary">No budgets set yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)] text-xs uppercase text-secondary">
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Starts</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-[var(--background)]/50">
                  <td className="px-4 py-3 font-medium capitalize">{b.period.toLowerCase()}</td>
                  <td className="px-4 py-3 text-secondary">
                    {new Date(b.periodStart).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-secondary">{b.category || "Overall"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {money(b.amount, b.currency)}
                  </td>
                  <td className="px-4 py-3 text-secondary">{b.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ExpenseCategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [cats, setCats] = useState<{ name: string; scope: string }[]>([]);
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void fetch("/api/finance/expense-categories")
      .then((r) => r.json())
      .then((d) => setCats(d.categories || []))
      .catch(() => {});
  }, []);

  async function addCustom() {
    const name = custom.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch("/api/finance/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scope: "BOTH" }),
      });
      if (res.ok) {
        setCats((prev) => {
          if (prev.some((c) => c.name.toLowerCase() === name.toLowerCase())) return prev;
          return [...prev, { name, scope: "BOTH" }].sort((a, b) => a.name.localeCompare(b.name));
        });
        onChange(name);
        setCustom("");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Category
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field mt-1.5 w-full"
        >
          <option value="">Select category…</option>
          {cats.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
              {c.scope && c.scope !== "BOTH" ? ` (${c.scope.toLowerCase()})` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Or type a new category"
          className="input-field min-w-[12rem] flex-1"
        />
        <button
          type="button"
          disabled={adding || !custom.trim()}
          onClick={() => void addCustom()}
          className="btn-secondary text-sm disabled:opacity-50"
        >
          Add category
        </button>
      </div>
    </div>
  );
}


export function DebtorsPanel() {
  const [rows, setRows] = useState<
    {
      id: string;
      name: string;
      principal: number;
      amountReceived: number;
      balance: number;
      currency: string;
      reason: string | null;
      dueDate: string | null;
    }[]
  >([]);
  const [totals, setTotals] = useState({
    totalPrincipal: 0,
    totalReceived: 0,
    totalBalance: 0,
    count: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [reason, setReason] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [receiveAmt, setReceiveAmt] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/debtors");
      const data = await res.json();
      setRows(data.debtors || []);
      setTotals(
        data.totals || {
          totalPrincipal: 0,
          totalReceived: 0,
          totalBalance: 0,
          count: 0,
        },
      );
    } catch {
      setError("Could not load debtors.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/debtors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          principal: Number(principal),
          currency,
          reason: reason || null,
          dueDate: dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShow(false);
      setName("");
      setPrincipal("");
      setReason("");
      setDueDate("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReceive(e: FormEvent) {
    e.preventDefault();
    if (!receiveId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/debtors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          id: receiveId,
          amount: Number(receiveAmt),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReceiveId(null);
      setReceiveAmt("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[var(--text)]">Debtors</h2>
          <p className="text-xs text-secondary sm:text-sm">
            People or organisations who owe <strong>you</strong> money — opposite of creditors.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white sm:px-4"
        >
          {show ? "Close" : "+ Add debtor"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
          <p className="text-[0.65rem] font-medium uppercase text-secondary">People</p>
          <p className="text-lg font-semibold tabular-nums">{totals.count}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
          <p className="text-[0.65rem] font-medium uppercase text-secondary">Owed to you</p>
          <p className="text-lg font-semibold tabular-nums text-emerald-700">
            {money(totals.totalBalance)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
          <p className="text-[0.65rem] font-medium uppercase text-secondary">Already received</p>
          <p className="text-lg font-semibold tabular-nums">{money(totals.totalReceived)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
          <p className="text-[0.65rem] font-medium uppercase text-secondary">Original total</p>
          <p className="text-lg font-semibold tabular-nums">{money(totals.totalPrincipal)}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {show && (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2"
        >
          <label className="text-sm font-medium sm:col-span-2">
            Who owes you?
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field mt-1.5 w-full"
              placeholder="Name"
            />
          </label>
          <label className="text-sm font-medium">
            Amount owed
            <input
              required
              type="number"
              min={0}
              step="any"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium">
            Currency
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium">
            Reason
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field mt-1.5 w-full"
              placeholder="Loan, unpaid invoice…"
            />
          </label>
          <label className="text-sm font-medium">
            Expected by
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto disabled:opacity-50">
              {busy ? "Saving…" : "Save debtor"}
            </button>
          </div>
        </form>
      )}

      {receiveId && (
        <form
          onSubmit={onReceive}
          className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:grid-cols-2"
        >
          <p className="text-sm font-semibold sm:col-span-2">Record money received</p>
          <label className="text-sm font-medium">
            Amount received
            <input
              required
              type="number"
              min={0}
              step="any"
              value={receiveAmt}
              onChange={(e) => setReceiveAmt(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
              Confirm
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setReceiveId(null);
                setReceiveAmt("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-secondary">No debtors yet. Add anyone who owes you money.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((d) => {
              const pct =
                d.principal > 0
                  ? Math.min(100, Math.round((d.amountReceived / d.principal) * 100))
                  : 0;
              return (
                <li
                  key={d.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--text)]">{d.name}</p>
                      {d.reason && (
                        <p className="text-xs text-secondary">{d.reason}</p>
                      )}
                    </div>
                    <p className="text-right text-sm font-semibold text-emerald-700 tabular-nums">
                      {money(d.balance, d.currency)}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-secondary">
                    <span>Original {money(d.principal, d.currency)}</span>
                    <span className="text-right">
                      Received {money(d.amountReceived, d.currency)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary mt-3 w-full rounded-full py-2 text-xs"
                    onClick={() => {
                      setReceiveId(d.id);
                      setReceiveAmt(String(d.balance || ""));
                    }}
                    disabled={d.balance <= 0}
                  >
                    Record receipt
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm md:block">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)] text-xs uppercase text-secondary">
                  <th className="px-4 py-3 font-semibold">Debtor</th>
                  <th className="px-4 py-3 font-semibold text-right">Original</th>
                  <th className="px-4 py-3 font-semibold text-right">Received</th>
                  <th className="px-4 py-3 font-semibold text-right">Balance</th>
                  <th className="px-4 py-3 font-semibold">Progress</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((d) => {
                  const pct =
                    d.principal > 0
                      ? Math.min(100, Math.round((d.amountReceived / d.principal) * 100))
                      : 0;
                  return (
                    <tr key={d.id} className="hover:bg-[var(--background)]/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{d.name}</p>
                        {d.reason && (
                          <p className="text-xs text-secondary">{d.reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(d.principal, d.currency)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-secondary">
                        {money(d.amountReceived, d.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                        {money(d.balance, d.currency)}
                      </td>
                      <td className="px-4 py-3 min-w-[7rem]">
                        <span className="text-xs text-secondary">{pct}%</span>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                          disabled={d.balance <= 0}
                          onClick={() => {
                            setReceiveId(d.id);
                            setReceiveAmt(String(d.balance || ""));
                          }}
                        >
                          Receive
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--border)] bg-[var(--background)] font-semibold">
                  <td className="px-4 py-3">Totals</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(totals.totalPrincipal)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(totals.totalReceived)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {money(totals.totalBalance)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
