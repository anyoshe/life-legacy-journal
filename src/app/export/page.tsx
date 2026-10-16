import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Download, FileJson, FileText } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro } from "@/components/ui/PageIntro";

export default async function ExportPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  return (
    <AppShell rightSlot={<UserButton />}>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <PageIntro
          eyebrow="My Data"
          title="Export your journal"
          description="Download a private copy of your data only — never your partner’s private entries."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <a href="/api/export?format=json" className="card-interactive flex items-start gap-3 p-5">
            <FileJson className="mt-0.5 text-primary" size={22} />
            <div>
              <p className="font-semibold text-[var(--text)]">JSON export</p>
              <p className="mt-1 text-xs text-secondary">Full structured backup</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                <Download size={14} /> Download JSON
              </span>
            </div>
          </a>
          <a href="/api/export?format=markdown" className="card-interactive flex items-start gap-3 p-5">
            <FileText className="mt-0.5 text-primary" size={22} />
            <div>
              <p className="font-semibold text-[var(--text)]">Markdown export</p>
              <p className="mt-1 text-xs text-secondary">Readable for archives</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                <Download size={14} /> Download Markdown
              </span>
            </div>
          </a>
        </div>

        <p className="text-center text-sm">
          <Link href="/dashboard" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </AppShell>
  );
}
