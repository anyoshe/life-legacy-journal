"use client";

import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro } from "@/components/ui/PageIntro";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Invitation = {
  id: string;
  inviteeEmail: string | null;
  invitationExpiresAt: string | null;
  createdAt: string;
  partnerA: { name: string | null; email: string };
};

type OutgoingInvitation = {
  id: string;
  inviteeEmail: string | null;
  invitationExpiresAt: string | null;
  createdAt: string;
};

type RelationshipMember = { name: string | null; email: string };

export default function CouplePage() {
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingInvitation[]>([]);
  const [relationship, setRelationship] = useState<RelationshipMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadInvitations() {
    try {
      const response = await fetch("/api/couples/invitations");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load invitations.");
      setInvitations(data.incoming);
      setOutgoing(data.outgoing);
      setRelationship(data.relationship);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load invitations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvitations();
  }, []);

  async function sendInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/couples/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send invitation.");
      setEmail("");
      setMessage(data.message);
      await loadInvitations();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  async function respond(invitationId: string, decision: "accept" | "reject") {
    setRespondingTo(invitationId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/couples/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to respond to invitation.");
      setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
      setMessage(decision === "accept" ? "Invitation accepted. Your couple is now active." : "Invitation declined.");
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "Unable to respond to invitation.");
    } finally {
      setRespondingTo(null);
    }
  }

  return (
    <AppShell rightSlot={<UserButton />}>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 pb-8">
        <PageIntro
          eyebrow="Together"
          title="Couple"
          description="Share the journey only as far as you both choose."
        />

      <header className="border-b border-[var(--border)] bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="text-sm text-secondary hover:text-primary">
            ← Dashboard
          </Link>
          <span className="font-semibold text-primary">Couple</span>
          <UserButton />
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <section className="card p-6">
          <h1 className="text-xl font-semibold text-[var(--text)]">Invite your partner</h1>
          <p className="mt-2 text-sm text-secondary">
            We&apos;ll email an invitation link. Your private journal entries remain private unless you choose to share them.
          </p>
          <form onSubmit={sendInvitation} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="partner-email">Partner email address</label>
            <input
              id="partner-email"
              type="email"
              required
              disabled={submitting || Boolean(relationship)}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Partner's email address"
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-surface px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submitting || Boolean(relationship)}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send invitation"}
            </button>
          </form>
        </section>

        {message && <p role="status" className="text-sm text-secondary">{message}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        {relationship && (
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Your couple</h2>
            <p className="mt-2 text-sm text-secondary">
              Connected with {relationship.name || relationship.email}.
              Your personal entries remain private by default.
            </p>
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Invitation sent</h2>
            <p className="mt-2 text-sm text-secondary">
              An invitation is pending. We won&apos;t confirm whether an address has an account.
            </p>
            {outgoing[0].invitationExpiresAt && (
              <p className="mt-2 text-xs text-secondary">
                Expires {new Date(outgoing[0].invitationExpiresAt).toLocaleString()}.
              </p>
            )}
          </section>
        )}

        <section className="card p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Invitations for you</h2>
          {loading ? (
            <p className="mt-4 text-sm text-secondary">Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">You have no pending invitations.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium text-[var(--text)]">
                      {invitation.partnerA.name || invitation.partnerA.email}
                    </p>
                    <p className="text-sm text-secondary">{invitation.partnerA.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={respondingTo === invitation.id}
                      onClick={() => void respond(invitation.id, "accept")}
                      className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={respondingTo === invitation.id}
                      onClick={() => void respond(invitation.id, "reject")}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-secondary disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
    </AppShell>
  );
}
