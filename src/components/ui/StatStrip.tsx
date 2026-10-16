export function StatStrip({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    tone?: "indigo" | "sage" | "gold" | "default";
  }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const tone =
          item.tone === "indigo"
            ? "text-primary"
            : item.tone === "sage"
              ? "text-[var(--secondary)]"
              : item.tone === "gold"
                ? "text-[var(--achievement)]"
                : "text-[var(--text)]";
        return (
          <div key={item.label} className="card px-3 py-3 text-center">
            <p className={`text-xl font-semibold ${tone}`}>{item.value}</p>
            <p className="text-[0.65rem] text-secondary">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}
