import { type ReactNode } from "react";

export function LifeHero({
  greeting,
  name,
  subtitle,
  variant = "indigo",
  children,
}: {
  greeting: string;
  name?: string | null;
  subtitle?: string;
  variant?: "indigo" | "sage" | "rose" | "warm";
  children?: ReactNode;
}) {
  const cls =
    variant === "sage"
      ? "life-hero life-hero-sage"
      : variant === "rose"
        ? "life-hero life-hero-rose"
        : variant === "warm"
          ? "life-hero life-hero-warm"
          : "life-hero";

  return (
    <div className={cls}>
      <div className="relative z-10">
        <p className="text-sm font-medium text-white/80">{greeting}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {name ? `${name}` : "Your life story"}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
