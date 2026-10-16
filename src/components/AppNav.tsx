"use client";

/**
 * Re-exports the unified shell navigation.
 * Prefer: import { AppShell } from "@/components/layout/AppShell"
 */
export { AppShell } from "@/components/layout/AppShell";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

/** Minimal sticky top bar for pages that already have their own full-width content without shell */
export function AppShellHeader({ rightSlot }: { rightSlot?: ReactNode }) {
  return (
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
  );
}

/** Optional helper: wrap page body with full shell */
export function withAppShell(children: ReactNode, rightSlot?: ReactNode) {
  return <AppShell rightSlot={rightSlot}>{children}</AppShell>;
}
