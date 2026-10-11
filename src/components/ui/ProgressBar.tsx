export function ProgressBar({
  value,
  max = 100,
  variant = "default",
  className = "",
}: {
  value: number;
  max?: number;
  variant?: "default" | "gold" | "sage";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fill =
    variant === "gold"
      ? "progress-fill progress-fill-gold"
      : variant === "sage"
        ? "progress-fill progress-fill-sage"
        : "progress-fill";

  return (
    <div className={`progress-track ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
