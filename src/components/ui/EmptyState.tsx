import Link from "next/link";
import type { ReactNode } from "react";

export function EmptyState({
  emoji,
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  emoji?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      {emoji && (
        <span className="mb-2 text-3xl" aria-hidden>
          {emoji}
        </span>
      )}
      <p className="text-base font-semibold text-[var(--text)]">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-secondary">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-primary mt-4">
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  );
}
