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
  const [rows, setRows] = useState<SavingsRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [purpose, setPurpose] = useState("EMERGENCY");
  const [purposeLabel, setPurposeLabel] = useState("");
  const [target, setTarget] = useState("");
  const [dest, setDest] = useState("");
  const [deadline, setDeadline] = useState("");
  const [currency, setCurrency] = useState("KES");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/savings");
      const data = await res.json();
      setRows(data.savings || []);
    } catch {
      setError("Could not load savings.");
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
      const res = await fetch("/api/finance/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          purposeLabel: purpose === "CUSTOM" ? purposeLabel : undefined,
          targetAmount: Number(target),
          currency,
          savingsDestination: dest || undefined,
          deadline: deadline || undefined,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Savings goals</h2>
          <p className="text-xs text-secondary">
            Emergency fund, school fees, and other targets — tracked under Finance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
        >
          {show ? "Close" : "+ New savings goal"}
        </button>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
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
            Currency
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium">
            Where I save
            <input
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              placeholder="Bank, M-Pesa, SACCO…"
              className="input-field mt-1.5 w-full"
            />
          </label>
          <label className="text-sm font-medium">
            Target date
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-field mt-1.5 w-full"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
              {busy ? "Saving…" : "Create savings goal"}
            </button>
          </div>
        </form>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-secondary">
          No savings goals yet. Add emergency fund, fees, or any custom target.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const pct =
              r.targetAmount > 0
                ? Math.min(100, Math.round((r.savedAmount / r.targetAmount) * 100))
                : 0;
            return (
              <li
                key={r.goalId}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{r.title}</p>
                    <p className="text-xs text-secondary">
                      {r.purposeLabel || r.purpose || "Savings"}
                      {r.savingsDestination ? ` · ${r.savingsDestination}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    {money(r.savedAmount, r.currency)} / {money(r.targetAmount, r.currency)}
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--secondary)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-secondary">
                  {pct}% · {money(r.balance, r.currency)} remaining
                </p>
              </li>
            );
          })}
        </ul>
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
          <p className="text-xs text-secondary">
            Daily, weekly, or monthly limits — overall or by category.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
        >
          {show ? "Close" : "+ Set budget"}
        </button>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
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
        <ul className="space-y-2">
          {rows.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <div>
                <p className="font-medium text-[var(--text)]">
                  {b.period.toLowerCase()} · {new Date(b.periodStart).toLocaleDateString()}
                </p>
                <p className="text-xs text-secondary">
                  {b.category || "Overall"}
                  {b.notes ? ` · ${b.notes}` : ""}
                </p>
              </div>
              <p className="font-semibold">{money(b.amount, b.currency)}</p>
            </li>
          ))}
        </ul>
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
