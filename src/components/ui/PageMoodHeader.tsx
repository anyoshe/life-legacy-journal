import type { ReactNode } from "react";

type Accent =
  | "indigo"
  | "sage"
  | "gold"
  | "rose"
  | "lavender"
  | "parchment"
  | "sky";

const accentFallback: Record<Accent, string> = {
  indigo: "linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #818cf8 100%)",
  sage: "linear-gradient(135deg, #14532d 0%, #5b8a72 55%, #86a995 100%)",
  gold: "linear-gradient(135deg, #713f12 0%, #e0a82e 60%, #f5d78e 100%)",
  rose: "linear-gradient(135deg, #9f1239 0%, #e11d48 50%, #fb7185 100%)",
  lavender: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #c4b5fd 100%)",
  parchment: "linear-gradient(135deg, #78350f 0%, #a16207 45%, #fde68a 100%)",
  sky: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #7dd3fc 100%)",
};

/**
 * Non-dashboard page hero only. Supports optional local photo under /moods/.
 * Gradient fallback always present if image missing.
 */
export function PageMoodHeader({
  accent,
  imageSrc,
  eyebrow,
  title,
  description,
  action,
}: {
  accent: Accent;
  /** e.g. /moods/goals-mountain.jpg — local public asset */
  imageSrc?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="relative mb-6 overflow-hidden rounded-2xl text-white shadow-sm"
      style={{
        background: accentFallback[accent],
        minHeight: "8.5rem",
      }}
    >
      {imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/15" />
      <div className="relative flex flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-6 sm:py-8">
        <div className="max-w-xl space-y-1.5">
          {eyebrow && (
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/80">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description && (
            <p className="text-sm leading-relaxed text-white/90">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
