"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  HeartHandshake,
  Home,
  Moon,
  Sparkles,
  Target,
  CalendarCheck,
  ClipboardList,
  Leaf,
} from "lucide-react";

const primaryLinks = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/entries", label: "Journal", icon: BookOpen },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/habits", label: "Habits", icon: Leaf },
];

const moreLinks = [
  { href: "/foundation", label: "Foundation", icon: Compass },
  { href: "/dreams", label: "Dreams", icon: Moon },
  { href: "/reviews", label: "Reviews", icon: ClipboardList },
  { href: "/couple", label: "Couple", icon: HeartHandshake },
];

function linkActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ compact }: { compact?: boolean }) {
  const pathname = usePathname() || "";

  return (
    <>
      {/* Desktop / tablet top links */}
      <nav
        aria-label="Main navigation"
        className={compact ? "hidden lg:flex items-center gap-0.5" : "hidden xl:flex items-center gap-0.5"}
      >
        {[...primaryLinks, ...moreLinks].map((link) => {
          const active = linkActive(pathname, link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "inline-flex items-center gap-1.5 rounded-xl bg-[var(--private-bg)] px-2.5 py-2 text-sm font-semibold text-primary"
                  : "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm text-secondary transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--text)]"
              }
              aria-current={active ? "page" : undefined}
            >
              <Icon size={15} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom bar — primary destinations only */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_20px_rgb(31_41_55/0.06)] backdrop-blur-md xl:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between">
          {primaryLinks.map((link) => {
            const active = linkActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <li key={link.href} className="flex-1">
                <Link
                  href={link.href}
                  className={
                    active
                      ? "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-primary"
                      : "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-secondary"
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
                    <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                  </span>
                  <span className="text-[0.65rem] font-medium">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export function AppShellHeader({
  rightSlot,
}: {
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="group flex shrink-0 items-center gap-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary)] text-white shadow-sm">
            <Sparkles size={16} aria-hidden />
          </span>
          <span className="text-base font-semibold tracking-tight text-primary sm:text-lg">
            Life <span className="text-[var(--text)]">&amp; Legacy</span>
          </span>
        </Link>
        <AppNav />
        <div className="flex items-center gap-2">{rightSlot}</div>
      </div>
    </header>
  );
}
