import Link from "next/link";
import { type ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--private-bg)] text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-primary mt-6">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
