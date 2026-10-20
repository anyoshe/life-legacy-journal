"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useState, type ReactNode } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import {
  appNavItems,
  isNavActive,
  mobilePrimaryNav,
} from "@/lib/nav-config";
import { NavigationProgress } from "@/components/ui/NavigationProgress";

/**
 * Layout B — slim dark icon rail + mobile bottom nav.
 * Used on all authenticated pages except the dashboard.
 */
export function ImmersiveShell({
  children,
  rightSlot,
}: {
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  const pathname = usePathname() || "";
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMoreOpen(false);
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen && !expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setExpanded(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen, expanded]);

  return (
    <div className="page-wash min-h-screen">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {/* Desktop icon rail */}
      <aside
        className={
          expanded
            ? "fixed inset-y-0 left-0 z-30 hidden w-52 flex-col bg-[#1C1917] transition-[width] lg:flex"
            : "fixed inset-y-0 left-0 z-30 hidden w-14 flex-col bg-[#1C1917] transition-[width] lg:flex"
        }
        aria-label="Workspace navigation"
      >
        <div
          className={
            expanded
              ? "flex h-14 items-center justify-between gap-2 border-b border-white/10 px-3"
              : "flex h-14 items-center justify-center border-b border-white/10"
          }
        >
          <Link
            href="/dashboard"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white"
            title="Life & Legacy"
          >
            <Sparkles size={14} aria-hidden />
          </Link>
          {expanded && (
            <span className="truncate text-xs font-semibold text-white/90">Life &amp; Legacy</span>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            title={expanded ? "Collapse" : "Expand"}
          >
            <Menu size={16} aria-hidden />
          </button>
        </div>
        <nav
          className={
            expanded
              ? "flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3"
              : "flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3"
          }
        >
          {appNavItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={
                  expanded
                    ? active
                      ? "flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-semibold text-white"
                      : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                    : active
                      ? "group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white"
                      : "group relative flex h-10 w-10 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                }
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" aria-hidden />
                {expanded ? (
                  <span className="truncate">{item.label}</span>
                ) : (
                  <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1C1917] px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {rightSlot && (
          <div
            className={
              expanded
                ? "flex items-center gap-2 border-t border-white/10 p-3"
                : "flex justify-center border-t border-white/10 p-3"
            }
          >
            {rightSlot}
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-surface/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden sticky-safe-top">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">
            <Sparkles size={14} aria-hidden />
          </span>
          <span className="text-sm font-semibold text-[var(--text)]">
            Life &amp; Legacy
          </span>
        </Link>
        <div className="flex items-center gap-2">{rightSlot}</div>
      </header>

      <div className={expanded ? "lg:pl-52" : "lg:pl-14"}>
        <div className="pb-nav min-h-screen">{children}</div>
      </div>

      {/* Mobile bottom */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-surface/95 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden touch-manipulation"
        aria-label="Mobile navigation"
      >
        <ul className="mx-auto flex max-w-lg">
          {mobilePrimaryNav.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={
                    active
                      ? "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-primary"
                      : "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-secondary"
                  }
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  <span className="text-[0.65rem] font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 text-secondary"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
            >
              <Menu size={18} aria-hidden />
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
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 id={titleId} className="font-semibold text-[var(--text)]">
                More
              </h2>
              <button
                type="button"
                className="rounded-full p-2 text-secondary"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="space-y-1 pb-4">
              {appNavItems
                .filter((i) => !mobilePrimaryNav.some((p) => p.href === i.href))
                .map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.href);
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
                      >
                        <Icon size={18} aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/** Alias for gradual migration from AppShell */
export function AppShell(props: {
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  return <ImmersiveShell {...props} />;
}
