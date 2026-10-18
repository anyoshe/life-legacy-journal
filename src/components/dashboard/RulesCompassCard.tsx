"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  rulesHeadline?: string | null;
  ruleTitles: string[];
  dailyCommitment?: string | null;
};

function clip(text: string, max: number) {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max).trim()}…`;
}

export function RulesCompassCard({
  rulesHeadline,
  ruleTitles,
  dailyCommitment,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasTitles = ruleTitles.length > 0;

  return (
    <div className="card-interactive block space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-5 shadow-sm sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rose-700">
            Rules
            {rulesHeadline ? (
              <span className="ml-2 font-semibold normal-case tracking-normal text-[var(--text)]">
                · {clip(rulesHeadline, 40)}
              </span>
            ) : null}
          </p>
        </div>
        <Link
          href="/foundation#rules"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Edit →
        </Link>
      </div>

      {/* Always visible: daily commitment */}
      {dailyCommitment ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--wash,var(--surface))]/90 px-3.5 py-2.5">
          <p className="text-[0.6rem] font-bold uppercase tracking-wide text-secondary">
            Daily commitment
          </p>
          <p className="mt-1 text-sm font-medium leading-snug text-[var(--text)]">
            {dailyCommitment}
          </p>
        </div>
      ) : (
        <p className="text-sm text-secondary">
          No daily commitment yet.{" "}
          <Link href="/foundation#rules" className="font-semibold text-primary hover:underline">
            Add one
          </Link>
        </p>
      )}

      {/* Expandable rule titles */}
      {hasTitles && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            aria-expanded={open}
          >
            {open ? (
              <>
                <ChevronUp size={14} /> Hide rules
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                See more · {ruleTitles.length} rules
              </>
            )}
          </button>

          {open && (
            <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {ruleTitles.map((r, i) => (
                <li key={`${r}-${i}`} className="flex gap-2 text-xs leading-snug">
                  <span className="shrink-0 font-bold text-primary">{i + 1}.</span>
                  <span className="font-semibold text-[var(--text)]">{r}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
