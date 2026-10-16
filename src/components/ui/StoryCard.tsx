import Link from "next/link";
import type { ReactNode } from "react";

export function StoryCard({
  href,
  tone = "default",
  eyebrow,
  title,
  body,
  footer,
  children,
}: {
  href?: string;
  tone?: "default" | "indigo" | "sage" | "rose" | "gold";
  eyebrow?: string;
  title: string;
  body?: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const toneClass =
    tone === "indigo"
      ? "card-tint-indigo"
      : tone === "sage"
        ? "card-tint-sage"
        : tone === "rose"
          ? "card-tint-rose"
          : tone === "gold"
            ? "card-tint-gold"
            : "";

  const inner = (
    <>
      {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
      <h3 className="text-base font-semibold tracking-tight text-[var(--text)]">
        {title}
      </h3>
      {body && (
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-secondary">
          {body}
        </p>
      )}
      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`card-interactive block p-4 ${toneClass}`}>
        {inner}
      </Link>
    );
  }

  return <div className={`card p-4 ${toneClass}`}>{inner}</div>;
}
