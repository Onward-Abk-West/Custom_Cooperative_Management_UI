"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

/**
 * Login screen. Layout only for now — submitting doesn't call the API
 * yet (there's no backend auth endpoint to call), but the form shape
 * matches the locked PRD decision: identifier is EMAIL OR PHONE NUMBER
 * (not a separate "username" concept), plus a PIN rather than a
 * password.
 */
export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: wire up to the auth endpoint once it exists.
    window.setTimeout(() => setSubmitting(false), 600);
  }

  return (
    <AuthCard
      panelTitle="Welcome Back!"
      panelSubtitle="Onward Abeokuta-West Cooperative Management System"
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
        Welcome
      </p>
      <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
        Sign in to continue
      </h1>
      <p className="mt-2 text-sm text-brand-ink/60">
        Use the email or phone number on your member record.
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

        <div>
          <label htmlFor="pin" className="sr-only">
            PIN
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="current-password"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="PIN"
            className="w-full rounded-full border border-brand-line bg-brand-line/25 px-5 py-3 tracking-[0.4em] text-sm text-brand-ink outline-none placeholder:tracking-normal placeholder:text-brand-ink/50 focus:border-brand-gold focus:bg-white focus:ring-2 focus:ring-brand-gold/30"
          />
        </div>

        <div className="-mt-1 text-right">
          <a
            href="/forgot-pin"
            className="text-xs font-medium text-brand-gold-dark hover:underline"
          >
            Forgot your PIN?
          </a>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-dark px-4 py-3 text-sm font-semibold text-brand-cream shadow-md transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-brand-ink/50">
        First time signing in? Use the PIN issued by your society&apos;s
        Admin or Supervisor.
      </p>
    </AuthCard>
  );
}
