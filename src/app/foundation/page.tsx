"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Plus, X } from "lucide-react";

type Foundation = {
  vision: string | null;
  mission: string | null;
  coreValues: string[];
  personalRules: string[];
};

export default function FoundationPage() {
  const [foundation, setFoundation] = useState<Foundation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [vision, setVision] = useState("");
  const [mission, setMission] = useState("");
  const [coreValues, setCoreValues] = useState<string[]>([]);
  const [personalRules, setPersonalRules] = useState<string[]>([]);
  const [newValue, setNewValue] = useState("");
  const [newRule, setNewRule] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/foundation");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load foundation.");
        const f = data.foundation as Foundation;
        setFoundation(f);
        setVision(f.vision ?? "");
        setMission(f.mission ?? "");
        setCoreValues(f.coreValues ?? []);
        setPersonalRules(f.personalRules ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load foundation.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/foundation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vision: vision || null,
          mission: mission || null,
          coreValues,
          personalRules,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      setFoundation(data.foundation);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-secondary">
        Loading foundation…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="text-sm font-medium text-[var(--text)]">Foundation</span>
          <Link href="/goals" className="text-sm text-primary">
            Goals →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 text-primary">
            <Compass size={20} />
            <span className="text-xs font-semibold uppercase tracking-wide">Life foundation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            Vision, mission &amp; values
          </h1>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Your vision is who you are becoming. Your mission is why you are here. Values and
            rules guide decisions. Goals in each life area (marriage, finance, career…) should
            serve this foundation — then actions move those goals, day by day.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Foundation saved.
          </p>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Life vision</h2>
            <p className="mt-1 text-xs text-secondary">
              5–20 years. Family, marriage, spiritual life, work, health, legacy…
            </p>
            <textarea
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              rows={6}
              placeholder="Who I want to become… what I want my life to look like…"
              className="mt-3 w-full rounded-xl border border-[var(--border)] bg-background px-4 py-3 text-sm leading-6 text-[var(--text)]"
            />
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Personal mission</h2>
            <p className="mt-1 text-xs text-secondary">
              Why you are here — contribution, calling, who you serve.
            </p>
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={4}
              placeholder="I exist to…"
              className="mt-3 w-full rounded-xl border border-[var(--border)] bg-background px-4 py-3 text-sm leading-6 text-[var(--text)]"
            />
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Core values</h2>
            <p className="mt-1 text-xs text-secondary">e.g. Faith, Integrity, Family, Discipline</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {coreValues.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-full bg-private px-3 py-1 text-sm text-primary"
                >
                  {v}
                  <button
                    type="button"
                    onClick={() => setCoreValues((list) => list.filter((x) => x !== v))}
                    aria-label={`Remove ${v}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Add a value"
                className="flex-1 rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const t = newValue.trim();
                    if (t && !coreValues.includes(t)) {
                      setCoreValues((list) => [...list, t]);
                      setNewValue("");
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const t = newValue.trim();
                  if (t && !coreValues.includes(t)) {
                    setCoreValues((list) => [...list, t]);
                    setNewValue("");
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Personal rules</h2>
            <p className="mt-1 text-xs text-secondary">
              Principles you will not compromise (e.g. “I will not sacrifice family for money”).
            </p>
            <ul className="mt-3 space-y-2">
              {personalRules.map((rule) => (
                <li
                  key={rule}
                  className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border)] bg-background px-3 py-2 text-sm"
                >
                  <span>{rule}</span>
                  <button
                    type="button"
                    onClick={() => setPersonalRules((list) => list.filter((x) => x !== rule))}
                    className="text-secondary hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                placeholder="Add a personal rule"
                className="flex-1 rounded-lg border border-[var(--border)] bg-background px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const t = newRule.trim();
                    if (t) {
                      setPersonalRules((list) => [...list, t]);
                      setNewRule("");
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const t = newRule.trim();
                  if (t) {
                    setPersonalRules((list) => [...list, t]);
                    setNewRule("");
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-secondary">
              Next: create goals under marriage, finance, career… that serve this vision.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save foundation"}
            </button>
          </div>
        </form>

        {!foundation?.vision && !foundation?.mission && (
          <p className="mt-6 text-center text-sm text-secondary">
            Empty is fine. Write when you are ready — this is your private compass.
          </p>
        )}
      </main>
    </div>
  );
}
