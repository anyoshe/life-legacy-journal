import type { ReactNode } from "react";

/** Decorative header for immersive pages only — never import on dashboard. */
export function PageMoodHeader({
  accent,
  eyebrow,
  title,
  description,
  action,
}: {
  accent: "indigo" | "sage" | "gold" | "rose" | "lavender" | "parchment" | "sky";
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const accents: Record<string, string> = {
    indigo: "linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #818cf8 100%)",
    sage: "linear-gradient(135deg, #14532d 0%, #5b8a72 55%, #86a995 100%)",
    gold: "linear-gradient(135deg, #713f12 0%, #e0a82e 60%, #f5d78e 100%)",
    rose: "linear-gradient(135deg, #9f1239 0%, #e11d48 50%, #fb7185 100%)",
    lavender: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #c4b5fd 100%)",
    parchment: "linear-gradient(135deg, #78350f 0%, #a16207 45%, #fde68a 100%)",
    sky: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #7dd3fc 100%)",
  };

  return (
    <div
      className="relative mb-6 overflow-hidden rounded-2xl text-white shadow-sm"
      style={{ background: accents[accent] }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
      <div className="relative flex flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-6 sm:py-7">
        <div className="max-w-xl space-y-1.5">
          {eyebrow && (
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/75">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description && (
            <p className="text-sm leading-relaxed text-white/85">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
