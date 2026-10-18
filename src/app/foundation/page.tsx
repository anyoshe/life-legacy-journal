"use client";

import { UserButton } from "@clerk/nextjs";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Pencil, Plus, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageMoodHeader } from "@/components/ui/PageMoodHeader";
import { StatStrip } from "@/components/ui/StatStrip";

type Detail = { title: string; body: string };
type SectionId = "vision" | "mission" | "values" | "rules";

type Foundation = {
  vision: string | null;
  visionHeadline: string | null;
  visionPillars: string[];
  visionQuote: string | null;
  mission: string | null;
  coreValues: string[];
  valuesHeadline: string | null;
  valuesQuote: string | null;
  coreValueDetails: Detail[];
  personalRules: string[];
  rulesHeadline: string | null;
  rulesSubtitle: string | null;
  ruleDetails: Detail[];
  rulesNonNegotiable: string | null;
  rulesDailyCommitment: string | null;
};

function SectionIndex({
  n,
  tone,
}: {
  n: number;
  tone: "indigo" | "sage" | "gold" | "rose";
}) {
  const bg =
    tone === "indigo"
      ? "linear-gradient(145deg, #312e81 0%, #4f46e5 45%, #6366f1 100%)"
      : tone === "sage"
        ? "linear-gradient(145deg, #14532d 0%, #5b8a72 55%, #86a995 100%)"
        : tone === "gold"
          ? "linear-gradient(145deg, #713f12 0%, #e0a82e 60%, #f5d78e 100%)"
          : "linear-gradient(145deg, #9f1239 0%, #e11d48 50%, #fb7185 100%)";
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
      style={{ background: bg }}
      aria-hidden
    >
      {n}
    </span>
  );
}

function FieldLabel({
  children,
  tone = "indigo",
}: {
  children: ReactNode;
  tone?: "indigo" | "sage" | "gold" | "rose";
}) {
  const color =
    tone === "indigo"
      ? "text-primary"
      : tone === "sage"
        ? "text-[var(--secondary)]"
        : tone === "gold"
          ? "text-[var(--achievement)]"
          : "text-rose-700";
  return (
    <p className={`text-[0.7rem] font-bold uppercase tracking-[0.08em] ${color}`}>
      {children}
    </p>
  );
}

const cardStyle = {
  background: "color-mix(in srgb, var(--surface) 96%, transparent)",
};

export default function FoundationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  /** null = all sections in display mode */
  const [editingSection, setEditingSection] = useState<SectionId | null>(null);

  const [visionHeadline, setVisionHeadline] = useState("");
  const [visionPillars, setVisionPillars] = useState<string[]>([]);
  const [vision, setVision] = useState("");
  const [visionQuote, setVisionQuote] = useState("");
  const [newPillar, setNewPillar] = useState("");

  const [mission, setMission] = useState("");

  const [valuesHeadline, setValuesHeadline] = useState("");
  const [coreValues, setCoreValues] = useState<string[]>([]);
  const [valuesQuote, setValuesQuote] = useState("");
  const [coreValueDetails, setCoreValueDetails] = useState<Detail[]>([]);
  const [newValue, setNewValue] = useState("");
  const [newDetailTitle, setNewDetailTitle] = useState("");
  const [newDetailBody, setNewDetailBody] = useState("");

  const [rulesHeadline, setRulesHeadline] = useState("");
  const [rulesSubtitle, setRulesSubtitle] = useState("");
  const [ruleDetails, setRuleDetails] = useState<Detail[]>([]);
  const [rulesNonNegotiable, setRulesNonNegotiable] = useState("");
  const [rulesDailyCommitment, setRulesDailyCommitment] = useState("");
  const [newRuleTitle, setNewRuleTitle] = useState("");
  const [newRuleBody, setNewRuleBody] = useState("");

  function loadFrom(f: Foundation) {
    setVision(f.vision ?? "");
    setVisionHeadline(f.visionHeadline ?? "");
    setVisionPillars(f.visionPillars ?? []);
    setVisionQuote(f.visionQuote ?? "");
    setMission(f.mission ?? "");
    setCoreValues(f.coreValues ?? []);
    setValuesHeadline(f.valuesHeadline ?? "");
    setValuesQuote(f.valuesQuote ?? "");
    setCoreValueDetails(Array.isArray(f.coreValueDetails) ? f.coreValueDetails : []);
    setRulesHeadline(f.rulesHeadline ?? "");
    setRulesSubtitle(f.rulesSubtitle ?? "");
    setRuleDetails(Array.isArray(f.ruleDetails) ? f.ruleDetails : []);
    setRulesNonNegotiable(f.rulesNonNegotiable ?? "");
    setRulesDailyCommitment(f.rulesDailyCommitment ?? "");
    // Legacy: personalRules only → seed ruleDetails titles if empty
    if (
      (!f.ruleDetails || f.ruleDetails.length === 0) &&
      (f.personalRules?.length ?? 0) > 0
    ) {
      setRuleDetails(f.personalRules.map((t) => ({ title: t, body: "" })));
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/foundation");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load foundation.");
        loadFrom(data.foundation as Foundation);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load foundation.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function saveSection(section: SectionId, event?: FormEvent) {
    event?.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    let body: Record<string, unknown> = {};
    if (section === "vision") {
      body = {
        visionHeadline: visionHeadline || null,
        visionPillars,
        vision: vision || null,
        visionQuote: visionQuote || null,
      };
    } else if (section === "mission") {
      body = { mission: mission || null };
    } else if (section === "values") {
      body = {
        valuesHeadline: valuesHeadline || null,
        coreValues,
        valuesQuote: valuesQuote || null,
        coreValueDetails,
      };
    } else {
      body = {
        rulesHeadline: rulesHeadline || null,
        rulesSubtitle: rulesSubtitle || null,
        ruleDetails,
        rulesNonNegotiable: rulesNonNegotiable || null,
        rulesDailyCommitment: rulesDailyCommitment || null,
      };
    }
    try {
      const res = await fetch("/api/foundation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      if (data.foundation) loadFrom(data.foundation as Foundation);
      setEditingSection(null);
      setSavedMsg(
        section === "vision"
          ? "Vision saved."
          : section === "mission"
            ? "Mission saved."
            : section === "values"
              ? "Values saved."
              : "Rules saved.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  function SectionEditBtn({ section }: { section: SectionId }) {
    if (editingSection === section) return null;
    return (
      <button
        type="button"
        onClick={() => {
          setEditingSection(section);
          setSavedMsg(null);
          setError(null);
        }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <Pencil size={14} /> Edit
      </button>
    );
  }

  function pageShell(children: ReactNode) {
    return (
      <AppShell rightSlot={<UserButton />}>
        <div className="relative min-h-[calc(100vh-4rem)]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: [
                "linear-gradient(160deg, rgba(247,244,239,0.90) 0%, rgba(247,244,239,0.75) 45%, rgba(247,244,239,0.88) 100%)",
                "url(/moods/goals-mountain.jpg)",
                "linear-gradient(145deg, #312e81 0%, #4f46e5 50%, #6366f1 100%)",
              ].join(", "),
              backgroundSize: "cover, cover, cover",
              backgroundPosition: "center, center, center",
              backgroundRepeat: "no-repeat",
            }}
            aria-hidden
          />
          <div className="relative z-10">{children}</div>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return pageShell(
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-secondary">
        Loading foundation…
      </main>,
    );
  }

  const filled =
    (visionHeadline || vision || visionPillars.length || visionQuote ? 1 : 0) +
    (mission ? 1 : 0) +
    (valuesHeadline || valuesQuote || coreValues.length || coreValueDetails.length ? 1 : 0) +
    (rulesHeadline || ruleDetails.length || rulesNonNegotiable || rulesDailyCommitment ? 1 : 0);

  return pageShell(
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageMoodHeader
        accent="indigo"
        imageSrc="/moods/goals-mountain.jpg"
        eyebrow="My Life"
        title="Foundation"
        description="Edit one section at a time — vision, mission, values, or rules."
        action={
          <Link
            href="/goals"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#312e81] shadow-sm"
          >
            Goals →
          </Link>
        }
      />

      <StatStrip
        items={[
          { label: "Sections filled", value: `${filled}/4`, tone: "indigo" },
          { label: "Rules", value: ruleDetails.length, tone: "gold" },
          { label: "Values", value: coreValueDetails.length || coreValues.length, tone: "sage" },
        ]}
      />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {savedMsg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-900">
          {savedMsg}
        </p>
      )}

      {/* ——— 1 VISION ——— */}
      <section id="vision" className="card scroll-mt-24 space-y-4 p-5 shadow-md sm:p-6" style={cardStyle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <SectionIndex n={1} tone="indigo" />
            <div>
              <FieldLabel tone="indigo">Life vision</FieldLabel>
              {editingSection !== "vision" && visionHeadline && (
                <h2 className="mt-1 text-xl font-bold uppercase tracking-wide text-[var(--text)]">
                  {visionHeadline}
                </h2>
              )}
            </div>
          </div>
          <SectionEditBtn section="vision" />
        </div>
        {editingSection === "vision" ? (
          <form onSubmit={(e) => saveSection("vision", e)} className="space-y-4">
            <label className="block text-xs font-bold uppercase text-primary">
              Headline
              <input
                value={visionHeadline}
                onChange={(e) => setVisionHeadline(e.target.value)}
                className="input-field mt-1 w-full font-semibold uppercase"
                placeholder="THE MAN I AM BECOMING"
              />
            </label>
            <div>
              <p className="text-xs font-bold uppercase text-primary">Pillars</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {visionPillars.map((p) => (
                  <li key={p} className="inline-flex items-center gap-1 rounded-full bg-[var(--private-bg)] px-3 py-1 text-sm font-bold text-primary">
                    {p}
                    <button type="button" onClick={() => setVisionPillars((x) => x.filter((i) => i !== p))}>
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <input
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = newPillar.trim();
                      if (v && !visionPillars.includes(v)) {
                        setVisionPillars((p) => [...p, v]);
                        setNewPillar("");
                      }
                    }
                  }}
                  className="input-field flex-1"
                  placeholder="God first"
                />
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => {
                    const v = newPillar.trim();
                    if (v && !visionPillars.includes(v)) {
                      setVisionPillars((p) => [...p, v]);
                      setNewPillar("");
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </div>
            <label className="block text-xs font-bold uppercase text-primary">
              Statement
              <textarea
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                rows={4}
                className="input-field mt-1 w-full"
              />
            </label>
            <label className="block text-xs font-bold uppercase text-primary">
              Quote
              <textarea
                value={visionQuote}
                onChange={(e) => setVisionQuote(e.target.value)}
                rows={2}
                className="input-field mt-1 w-full italic"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => setEditingSection(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary text-sm font-bold">
                {saving ? "Saving…" : "Save vision"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 pl-0 sm:pl-13">
            {visionPillars.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {visionPillars.map((p) => (
                  <li key={p} className="rounded-full bg-[var(--private-bg)] px-3 py-1 text-sm font-bold text-primary">
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {vision && <p className="text-base font-medium leading-relaxed text-[var(--text)]">{vision}</p>}
            {visionQuote && (
              <blockquote className="border-l-4 border-primary/40 pl-4 text-sm italic text-secondary">
                “{visionQuote}”
              </blockquote>
            )}
            {!visionHeadline && !vision && !visionPillars.length && !visionQuote && (
              <p className="text-sm text-secondary">Not set — click Edit.</p>
            )}
          </div>
        )}
      </section>

      {/* ——— 2 MISSION ——— */}
      <section id="mission" className="card scroll-mt-24 p-5 shadow-md sm:p-6" style={cardStyle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <SectionIndex n={2} tone="sage" />
            <div>
              <FieldLabel tone="sage">
                <span className="italic">Personal mission</span>
              </FieldLabel>
            </div>
          </div>
          <SectionEditBtn section="mission" />
        </div>
        {editingSection === "mission" ? (
          <form onSubmit={(e) => saveSection("mission", e)} className="mt-4 space-y-3">
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={4}
              className="input-field w-full"
              placeholder="Why you are here…"
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => setEditingSection(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary text-sm font-bold">
                {saving ? "Saving…" : "Save mission"}
              </button>
            </div>
          </form>
        ) : mission ? (
          <p className="mt-3 text-base font-semibold leading-relaxed text-[var(--text)]">{mission}</p>
        ) : (
          <p className="mt-3 text-sm text-secondary">Not set — click Edit.</p>
        )}
      </section>

      {/* ——— 3 VALUES (display + section edit kept compact; full structure from before) ——— */}
      <section id="values" className="card scroll-mt-24 space-y-4 p-5 shadow-md sm:p-6" style={cardStyle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <SectionIndex n={3} tone="gold" />
            <div>
              <FieldLabel tone="gold">Core values</FieldLabel>
              {editingSection !== "values" && valuesHeadline && (
                <h2 className="mt-1 text-xl font-bold uppercase tracking-wide">{valuesHeadline}</h2>
              )}
            </div>
          </div>
          <SectionEditBtn section="values" />
        </div>
        {editingSection === "values" ? (
          <form onSubmit={(e) => saveSection("values", e)} className="space-y-4">
            <input
              value={valuesHeadline}
              onChange={(e) => setValuesHeadline(e.target.value)}
              className="input-field w-full font-semibold uppercase"
              placeholder="MY VALUES, MY STANDARD"
            />
            <ul className="flex flex-wrap gap-2">
              {coreValues.map((v) => (
                <li key={v} className="inline-flex items-center gap-1 rounded-full bg-[var(--private-bg)] px-3 py-1 text-sm font-bold text-[var(--achievement)]">
                  {v}
                  <button type="button" onClick={() => setCoreValues((x) => x.filter((i) => i !== v))}>
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="input-field flex-1"
                placeholder="Short name e.g. Faith"
              />
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => {
                  const v = newValue.trim();
                  if (v && !coreValues.includes(v)) {
                    setCoreValues((p) => [...p, v]);
                    setNewValue("");
                  }
                }}
              >
                Add name
              </button>
            </div>
            <textarea
              value={valuesQuote}
              onChange={(e) => setValuesQuote(e.target.value)}
              rows={2}
              className="input-field w-full italic"
              placeholder="Standard quote…"
            />
            {coreValueDetails.map((d, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-bold">
                    {i + 1}. {d.title}
                  </p>
                  <button type="button" onClick={() => setCoreValueDetails((p) => p.filter((_, j) => j !== i))}>
                    <X size={16} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-secondary">{d.body}</p>
              </div>
            ))}
            <input
              value={newDetailTitle}
              onChange={(e) => setNewDetailTitle(e.target.value)}
              className="input-field w-full font-semibold"
              placeholder="Value title e.g. Faith in God"
            />
            <textarea
              value={newDetailBody}
              onChange={(e) => setNewDetailBody(e.target.value)}
              rows={2}
              className="input-field w-full"
              placeholder="Meaning…"
            />
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => {
                if (!newDetailTitle.trim() && !newDetailBody.trim()) return;
                setCoreValueDetails((p) => [
                  ...p,
                  { title: newDetailTitle.trim() || "Untitled", body: newDetailBody.trim() },
                ]);
                setNewDetailTitle("");
                setNewDetailBody("");
              }}
            >
              <Plus size={14} className="mr-1 inline" /> Add value card
            </button>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => setEditingSection(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary text-sm font-bold">
                {saving ? "Saving…" : "Save values"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {coreValues.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {coreValues.map((v) => (
                  <li key={v} className="rounded-full bg-[var(--private-bg)] px-3 py-1 text-sm font-bold text-[var(--achievement)]">
                    {v}
                  </li>
                ))}
              </ul>
            )}
            {valuesQuote && (
              <blockquote className="border-l-4 border-[var(--achievement)]/50 pl-4 text-sm italic text-secondary">
                “{valuesQuote}”
              </blockquote>
            )}
            {coreValueDetails.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {coreValueDetails.map((d, i) => (
                  <article key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--achievement)] text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold">{d.title}</h3>
                        {d.body && <p className="mt-1 text-sm text-secondary">{d.body}</p>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {!valuesHeadline && !coreValues.length && !valuesQuote && !coreValueDetails.length && (
              <p className="text-sm text-secondary">Not set — click Edit.</p>
            )}
          </div>
        )}
      </section>

      {/* ——— 4 RULES (structured) ——— */}
      <section id="rules" className="card scroll-mt-24 space-y-4 p-5 shadow-md sm:p-6" style={cardStyle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <SectionIndex n={4} tone="rose" />
            <div>
              <FieldLabel tone="rose">Personal rules</FieldLabel>
              {editingSection !== "rules" && rulesHeadline && (
                <h2 className="mt-1 text-xl font-bold uppercase tracking-wide text-[var(--text)]">
                  {rulesHeadline}
                </h2>
              )}
              {editingSection !== "rules" && rulesSubtitle && (
                <p className="mt-1 text-sm font-semibold italic text-secondary">{rulesSubtitle}</p>
              )}
            </div>
          </div>
          <SectionEditBtn section="rules" />
        </div>

        {editingSection === "rules" ? (
          <form onSubmit={(e) => saveSection("rules", e)} className="space-y-4">
            <label className="block text-xs font-bold uppercase text-rose-700">
              Headline
              <input
                value={rulesHeadline}
                onChange={(e) => setRulesHeadline(e.target.value)}
                className="input-field mt-1 w-full font-semibold uppercase"
                placeholder="MY PERSONAL RULES"
              />
            </label>
            <label className="block text-xs font-bold uppercase text-rose-700">
              Subtitle
              <input
                value={rulesSubtitle}
                onChange={(e) => setRulesSubtitle(e.target.value)}
                className="input-field mt-1 w-full italic"
                placeholder="The Standards I Choose to Live By"
              />
            </label>

            <div>
              <p className="text-xs font-bold uppercase text-rose-700">Numbered rules</p>
              <p className="text-xs text-secondary">Title + meaning for each standard</p>
              <div className="mt-2 space-y-2">
                {ruleDetails.map((d, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-bold">
                        <span className="text-primary">{i + 1}. </span>
                        {d.title}
                      </p>
                      <button type="button" onClick={() => setRuleDetails((p) => p.filter((_, j) => j !== i))}>
                        <X size={16} />
                      </button>
                    </div>
                    {d.body && <p className="mt-1 text-xs text-secondary">{d.body}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2 rounded-xl border border-dashed border-[var(--border)] p-3">
                <input
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  className="input-field w-full font-semibold"
                  placeholder="Title — e.g. Put God First."
                />
                <textarea
                  value={newRuleBody}
                  onChange={(e) => setNewRuleBody(e.target.value)}
                  rows={2}
                  className="input-field w-full text-sm"
                  placeholder="Let my faith guide my decisions…"
                />
                <button
                  type="button"
                  className="btn-secondary text-sm font-semibold"
                  onClick={() => {
                    if (!newRuleTitle.trim() && !newRuleBody.trim()) return;
                    setRuleDetails((p) => [
                      ...p,
                      { title: newRuleTitle.trim() || "Untitled", body: newRuleBody.trim() },
                    ]);
                    setNewRuleTitle("");
                    setNewRuleBody("");
                  }}
                >
                  <Plus size={14} className="mr-1 inline" /> Add rule
                </button>
              </div>
            </div>

            <label className="block text-xs font-bold uppercase text-rose-700">
              Non-negotiable standard
              <textarea
                value={rulesNonNegotiable}
                onChange={(e) => setRulesNonNegotiable(e.target.value)}
                rows={3}
                className="input-field mt-1 w-full"
                placeholder="I will choose what is right over what is easy…"
              />
            </label>
            <label className="block text-xs font-bold uppercase text-rose-700">
              Daily commitment
              <textarea
                value={rulesDailyCommitment}
                onChange={(e) => setRulesDailyCommitment(e.target.value)}
                rows={3}
                className="input-field mt-1 w-full"
                placeholder="I do not need to be perfect; I need to be intentional…"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => setEditingSection(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary text-sm font-bold">
                {saving ? "Saving…" : "Save rules only"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {ruleDetails.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {ruleDetails.map((d, i) => (
                  <article
                    key={i}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text)]">{d.title}</h3>
                        {d.body && (
                          <p className="mt-1.5 text-sm font-medium leading-relaxed text-secondary">
                            {d.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {rulesNonNegotiable && (
              <div className="rounded-2xl border border-primary/20 bg-[var(--private-bg)] p-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                  Non-negotiable standard
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--text)]">
                  {rulesNonNegotiable}
                </p>
              </div>
            )}
            {rulesDailyCommitment && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-secondary">
                  Daily commitment
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--text)]">
                  {rulesDailyCommitment}
                </p>
              </div>
            )}
            {!rulesHeadline &&
              !ruleDetails.length &&
              !rulesNonNegotiable &&
              !rulesDailyCommitment && (
                <p className="text-sm text-secondary">Not set — click Edit on this section only.</p>
              )}
          </div>
        )}
      </section>

      <p className="text-center text-xs text-secondary">
        <Link href="/dashboard" className="font-semibold text-primary hover:underline">
          Back to dashboard
        </Link>
      </p>
    </main>,
  );
}
