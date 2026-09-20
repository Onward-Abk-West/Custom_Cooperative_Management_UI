"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

/**
 * First-login / forgotten-PIN request screen.
 *
 * This is NOT a self-service "email a reset link" flow — the locked
 * PRD decision is that PIN-reset approval belongs to the member's
 * society Supervisor and President jointly, not Admin, and not an
 * automated email/SMS link. So this screen only ever collects the
 * request and confirms it was sent; it doesn't (and shouldn't) issue
 * a new PIN itself. The actual approval + reissue happens on the
 * Supervisor/President side (PIN Reset Requests nav item) once that's
 * built, and there's no backend endpoint yet for this screen to call
 * — see the TODO below.
 */
export default function ForgotPinPage() {
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: wire up to the PIN-reset-request endpoint once it exists.
    // Expected shape: POST { identifier } -> creates a pending request
    // that both the society's Supervisor and President must approve.
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  }

  if (submitted) {
    return (
      <AuthCard
        panelTitle="Request sent"
        panelSubtitle="Onward Abeokuta-West Cooperative Management System"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
          Almost there
        </p>
        <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
          Your request has been sent
        </h1>
        <p className="mt-3 text-sm text-brand-ink/70">
          Your society&apos;s Supervisor and President have been notified.
          A new PIN is issued once both of them approve the request —
          this can take a little time, since it needs both approvals,
          not just one.
        </p>
        <a
          href="/login"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-green to-brand-green-dark px-4 py-3 text-center text-sm font-semibold text-brand-cream shadow-md transition hover:brightness-110"
        >
          Back to sign in
        </a>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      panelTitle="Forgot your PIN?"
      panelSubtitle="Onward Abeokuta-West Cooperative Management System"
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
        Reset request
      </p>
      <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
        Request a new PIN
      </h1>
      <p className="mt-2 text-sm text-brand-ink/60">
        Enter the email or phone number on your member record. Your
        society&apos;s Supervisor and President will need to approve the
        request before a new PIN is issued.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="identifier" className="sr-only">
            Email or phone number
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email or phone number"
            className="w-full rounded-full border border-brand-line bg-brand-line/25 px-5 py-3 text-sm text-brand-ink outline-none placeholder:text-brand-ink/50 focus:border-brand-gold focus:bg-white focus:ring-2 focus:ring-brand-gold/30"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-dark px-4 py-3 text-sm font-semibold text-brand-cream shadow-md transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send reset request"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-brand-ink/50">
        Remembered it?{" "}
        <a
          href="/login"
          className="font-medium text-brand-gold-dark hover:underline"
        >
          Back to sign in
        </a>
      </p>
    </AuthCard>
  );
}
