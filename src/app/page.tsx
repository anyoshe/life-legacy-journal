export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--private-bg)] via-transparent to-[var(--shared-goal-bg)] opacity-60" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">
            Life & Legacy Journal
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-[var(--text)] mb-6">
            Become a better man
            <br />
            <span className="text-primary">while building a meaningful life</span>
          </h1>
          <p className="text-lg md:text-xl text-secondary max-w-2xl mx-auto leading-relaxed mb-10">
            A calm, private space for your vision, goals, spiritual growth, marriage and the life you are building together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-8 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[var(--primary-dark)] transition-colors"
            >
              Sign In
            </a>
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-surface px-8 py-3.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--border-subtle)] transition-colors"
            >
              Create Account
            </a>
          </div>
        </div>
      </section>

      {/* Palette preview */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-center text-sm font-medium tracking-widest uppercase text-secondary mb-10">
          Brand Palette
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "Deep Indigo", hex: "#4338CA", role: "Primary" },
            { name: "Sage", hex: "#6B8E7B", role: "Growth" },
            { name: "Warm Gold", hex: "#D4A72C", role: "Achievement" },
            { name: "Warm Ivory", hex: "#FAF9F6", role: "Background" },
            { name: "Dusty Rose", hex: "#C9828B", role: "Marriage" },
            { name: "Teal", hex: "#4F8A8B", role: "Personal" },
            { name: "Terracotta", hex: "#C98268", role: "Family" },
            { name: "Charcoal", hex: "#1F2937", role: "Text" },
          ].map((color) => (
            <div key={color.hex} className="card p-4 text-center">
              <div
                className="h-16 rounded-lg mb-3 border border-[var(--border)]"
                style={{ backgroundColor: color.hex }}
              />
              <p className="text-sm font-medium text-[var(--text)]">{color.name}</p>
              <p className="text-xs text-secondary mt-0.5">{color.hex}</p>
              <p className="text-xs text-muted mt-1">{color.role}</p>
            </div>
          ))}
        </div>

        {/* Privacy states */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="bg-private rounded-2xl p-6 border border-[var(--border)]">
            <p className="text-sm font-semibold text-primary mb-1">🔒 Private</p>
            <p className="text-sm text-secondary">Only you can see this. Safe for honest reflection.</p>
          </div>
          <div className="bg-shared rounded-2xl p-6 border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--area-marriage)] mb-1">💛 Shared with Partner</p>
            <p className="text-sm text-secondary">Visible to both of you. Build together.</p>
          </div>
          <div className="bg-shared-goal rounded-2xl p-6 border border-[var(--border)]">
            <p className="text-sm font-semibold text-financial mb-1">🤝 Shared Goal</p>
            <p className="text-sm text-secondary">Joint goals you are pursuing as a couple.</p>
          </div>
        </div>
      </section>
    </main>
  );
}