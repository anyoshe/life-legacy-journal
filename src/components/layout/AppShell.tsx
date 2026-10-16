"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import {
  appNavItems,
  isNavActive,
  itemsInGroup,
  mobilePrimaryNav,
  navGroups,
} from "@/lib/nav-config";

/**
 * Authenticated shell: desktop left sidebar + mobile bottom bar + More sheet.
 * One nav config for all destinations.
 */
export function AppShell({
  children,
  rightSlot,
}: {
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  const pathname = usePathname() || "";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTitleId = useId();

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <div className="page-wash min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex"
        aria-label="Main sidebar"
      >
        <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">
            <Sparkles size={16} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text)]">
              Life &amp; Legacy
            </p>
            <p className="truncate text-[0.65rem] text-secondary">Your journey</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sidebar">
          {navGroups.map((g) => {
            const items = itemsInGroup(g.id);
            if (items.length === 0) return null;
            return (
              <div key={g.id} className="mb-5">
                <p className="mb-1.5 px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
                  {g.label}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={
                            active
                              ? "flex items-center gap-2.5 rounded-xl bg-[var(--private-bg)] px-2.5 py-2 text-sm font-semibold text-primary"
                              : "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-secondary transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--text)]"
                          }
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon size={17} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
        {rightSlot && (
          <div className="border-t border-[var(--border)] p-4">{rightSlot}</div>
        )}
      </aside>

      {/* Top bar mobile / tablet */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-surface/90 px-4 backdrop-blur-md lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">
            <Sparkles size={15} aria-hidden />
          </span>
          <span className="text-sm font-semibold text-[var(--text)]">
            Life &amp; Legacy
          </span>
        </Link>
        {rightSlot}
      </header>

      {/* Main */}
      <div className="lg:pl-60">
        <div className="pb-nav min-h-screen">{children}</div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_20px_rgb(28_25_23/0.06)] backdrop-blur-md lg:hidden"
        aria-label="Mobile navigation"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between">
          {mobilePrimaryNav.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={
                    active
                      ? "flex min-h-12 flex-col items-center justify-center gap-0.5 text-primary"
                      : "flex min-h-12 flex-col items-center justify-center gap-0.5 text-secondary"
                  }
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={
                      active
                        ? "flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--private-bg)]"
                        : "flex h-8 w-8 items-center justify-center"
                    }
                  >
                    <Icon size={18} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  </span>
                  <span className="text-[0.65rem] font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              className={
                moreOpen
                  ? "flex min-h-12 w-full flex-col items-center justify-center gap-0.5 text-primary"
                  : "flex min-h-12 w-full flex-col items-center justify-center gap-0.5 text-secondary"
              }
              aria-expanded={moreOpen}
              aria-controls={moreTitleId}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <span
                className={
                  moreOpen
                    ? "flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--private-bg)]"
                    : "flex h-8 w-8 items-center justify-center"
                }
              >
                <Menu size={18} aria-hidden />
              </span>
              <span className="text-[0.65rem] font-medium">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={moreTitleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-lg">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" />
            <div className="mb-4 flex items-center justify-between">
              <h2 id={moreTitleId} className="text-base font-semibold text-[var(--text)]">
                More
              </h2>
              <button
                type="button"
                className="rounded-full p-2 text-secondary hover:bg-[var(--border-subtle)]"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5 pb-4">
              {navGroups.map((g) => {
                const items = itemsInGroup(g.id).filter(
                  (i) => !mobilePrimaryNav.some((p) => p.href === i.href),
                );
                if (items.length === 0) return null;
                return (
                  <div key={g.id}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                      {g.label}
                    </p>
                    <ul className="space-y-1">
                      {items.map((item) => {
                        const active = isNavActive(pathname, item.href);
                        const Icon = item.icon;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setMoreOpen(false)}
                              className={
                                active
                                  ? "flex items-center gap-3 rounded-xl bg-[var(--private-bg)] px-3 py-2.5 text-sm font-semibold text-primary"
                                  : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary hover:bg-[var(--border-subtle)]"
                              }
                              aria-current={active ? "page" : undefined}
                            >
                              <Icon size={18} aria-hidden />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Backward-compatible thin header for pages not yet on AppShell */
export function AppShellHeader({ rightSlot }: { rightSlot?: ReactNode }) {
  return (
    <AppShell rightSlot={rightSlot}>
      <div className="hidden" />
    </AppShell>
  );
}
