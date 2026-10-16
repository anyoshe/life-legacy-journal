import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, FileJson, FileText } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";

export default async function ExportPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="page-wash min-h-screen pb-nav">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="text-sm font-medium text-[var(--text)]">Export</span>
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <p className="eyebrow mb-2">Your data</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Export your journal
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Download a private copy of foundation, entries, goals, habits,
            lessons, letters, experiences, reviews, dreams, and todos. Only your
            data — never your partner&apos;s private entries.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="/api/export?format=json"
            className="card-interactive flex items-start gap-3 p-5"
          >
            <FileJson className="mt-0.5 text-primary" size={22} />
            <div>
              <p className="font-semibold text-[var(--text)]">JSON export</p>
              <p className="mt-1 text-xs text-secondary">
                Full structured backup for tools and archives
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                <Download size={14} /> Download JSON
              </span>
            </div>
          </a>
          <a
            href="/api/export?format=markdown"
            className="card-interactive flex items-start gap-3 p-5"
          >
            <FileText className="mt-0.5 text-primary" size={22} />
            <div>
              <p className="font-semibold text-[var(--text)]">Markdown export</p>
              <p className="mt-1 text-xs text-secondary">
                Readable document for printing or long-term storage
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                <Download size={14} /> Download Markdown
              </span>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}
