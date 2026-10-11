const AREA_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  SPIRITUAL: { bg: "var(--private-bg)", color: "var(--area-spiritual)", label: "Spiritual" },
  MARRIAGE: { bg: "var(--shared-bg)", color: "var(--area-marriage)", label: "Marriage" },
  FAMILY: { bg: "#FDF4F0", color: "var(--area-family)", label: "Family" },
  FINANCIAL: { bg: "var(--shared-goal-bg)", color: "var(--area-financial)", label: "Financial" },
  CAREER: { bg: "#EEF6F8", color: "var(--area-personal)", label: "Career" },
  BUSINESS: { bg: "#EEF6F8", color: "var(--area-personal)", label: "Business" },
  PERSONAL: { bg: "#EEF6F8", color: "var(--area-personal)", label: "Personal" },
  HEALTH: { bg: "var(--shared-goal-bg)", color: "var(--area-habits)", label: "Health" },
  SOCIAL: { bg: "var(--shared-bg)", color: "var(--area-marriage)", label: "Social" },
  LEARNING: { bg: "#EEF3F8", color: "var(--area-learning)", label: "Learning" },
  SERVICE: { bg: "var(--private-bg)", color: "var(--primary)", label: "Service" },
  OTHER: { bg: "var(--border-subtle)", color: "var(--text-secondary)", label: "Other" },
};

export function AreaBadge({ area }: { area: string }) {
  const style = AREA_STYLES[area] ?? AREA_STYLES.OTHER;
  return (
    <span
      className="badge"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}
