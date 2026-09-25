export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          Life & Legacy Journal
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          Become a better man while building a meaningful life with the people you love.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Go to Dashboard
          </a>
          <a
            href="/entry/new"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            New Daily Entry
          </a>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 pt-8">
          Scaffold ready · Prisma schema loaded · AI system prompt ready
        </p>
      </div>
    </main>
  );
}
