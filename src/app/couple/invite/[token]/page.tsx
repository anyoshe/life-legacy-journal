"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type InvitationInfo = {
  inviterName: string | null;
  expiresAt: string;
};

export default function CoupleInvitationPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { isLoaded, isSignedIn } = useUser();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirectUrl = `/couple/invite/${encodeURIComponent(token)}`;
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`;

  useEffect(() => {
    let active = true;
    void fetch(`/api/couples/invitations/token/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load invitation.");
        if (active) setInvitation(data.invitation);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load invitation.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  async function respond(decision: "accept" | "reject") {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/couples/invitations/token/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to respond to invitation.");
      setInvitation(null);
      setMessage(decision === "accept"
        ? "Invitation accepted. Your couple is now active."
        : "Invitation declined.");
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "Unable to respond to invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="card w-full max-w-lg p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Life &amp; Legacy</p>
        <h1 className="mt-4 text-2xl font-semibold text-[var(--text)]">Couple invitation</h1>
        {loading ? (
          <p className="mt-4 text-sm text-secondary">Checking invitation...</p>
        ) : error ? (
          <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>
        ) : message ? (
          <p role="status" className="mt-4 text-sm text-secondary">{message}</p>
        ) : invitation ? (
          <>
            <p className="mt-4 text-sm leading-6 text-secondary">
              {invitation.inviterName || "Someone"} invited you to connect on Life &amp; Legacy.
              Your personal journal remains private unless you choose to share an entry.
            </p>
            <p className="mt-3 text-xs text-secondary">
              Expires {new Date(invitation.expiresAt).toLocaleString()}.
            </p>
            {!isLoaded ? (
              <p className="mt-6 text-sm text-secondary">Checking your account...</p>
            ) : !isSignedIn ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white" href={signInHref}>
                  Sign in to respond
                </Link>
                <Link className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-secondary" href={signUpHref}>
                  Create an account
                </Link>
              </div>
            ) : (
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void respond("accept")}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? "Responding..." : "Accept invitation"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void respond("reject")}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-secondary disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
          </>
        ) : null}
        <Link href="/" className="mt-8 inline-block text-sm text-secondary hover:text-primary">
          Return home
        </Link>
      </section>
    </main>
  );
}
