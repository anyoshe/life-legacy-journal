import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/foundation", label: "Foundation" },
  { href: "/entries", label: "Journal" },
  { href: "/goals", label: "Goals" },
  { href: "/habits", label: "Habits" },
  { href: "/dreams", label: "Dreams" },
  { href: "/couple", label: "Couple" },
];

export function AppNav({ current }: { current?: string }) {
  return (
    <nav aria-label="Main navigation" className="hidden items-center gap-0.5 xl:flex">
      {links.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-lg px-2.5 py-2 text-sm font-medium text-primary"
                : "rounded-lg px-2.5 py-2 text-sm text-secondary transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--text)]"
            }
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
