"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import {
  appNavItems,
  isNavActive,
  mobilePrimaryNav,
} from "@/lib/nav-config";

const topLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/today", label: "Today" },
  { href: "/goals", label: "Goals" },
  { href: "/entries", label: "Journal" },
];

export function DashboardTopNav({ rightSlot }: { rightSlot?: ReactNode }) {
  const pathname = usePathname() || "";
  const [moreOpen, setMoreOpen] = useState(false);
  const titleId = useId();

  useEffect(() => setMoreOpen(false), [pathname]);

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

  const secondary = appNavItems.filter(
    (i) => !topLinks.some((t) => t.href === i.href),
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <Sparkles size={15} aria-hidden />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight text-[var(--text)] sm:inline">
              Life &amp; Legacy
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Dashboard navigation"
          >
            {topLinks.map((link) => {
              const active = isNavActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? "rounded-full bg-[var(--private-bg)] px-3.5 py-1.5 text-sm font-semibold text-primary"
                      : "rounded-full px-3.5 py-1.5 text-sm text-secondary transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--text)]"
                  }
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="rounded-full px-3.5 py-1.5 text-sm text-secondary hover:bg-[var(--border-subtle)] hover:text-[var(--text)]"
            >
              More
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-secondary hover:bg-[var(--border-subtle)] md:hidden"
              aria-label="Open menu"
              onClick={() => setMoreOpen(true)}
            >
              <Menu size={18} />
            </button>
            {rightSlot}
          </div>
        </div>
      </header>

      {/* Mobile bottom */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-surface/95 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-md md:hidden"
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
                      ? "flex min-h-12 flex-col items-center justify-center gap-0.5 text-primary"
                      : "flex min-h-12 flex-col items-center justify-center gap-0.5 text-secondary"
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
            >
              <Menu size={18} aria-hidden />
              <span className="text-[0.65rem] font-medium">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-lg md:inset-x-auto md:bottom-auto md:right-6 md:top-16 md:max-h-[70vh] md:w-72 md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between md:mb-2">
              <h2 id={titleId} className="text-sm font-semibold text-[var(--text)]">
                All destinations
              </h2>
              <button
                type="button"
                className="rounded-full p-2 text-secondary hover:bg-[var(--border-subtle)]"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <ul className="space-y-0.5 pb-2">
              {secondary.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={
                        active
                          ? "flex items-center gap-2.5 rounded-xl bg-[var(--private-bg)] px-3 py-2.5 text-sm font-semibold text-primary"
                          : "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-secondary hover:bg-[var(--border-subtle)]"
                      }
                    >
                      <Icon size={16} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
