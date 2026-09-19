"use client";

import { useState } from "react";
import { CooperativeMark } from "@/components/illustrations/CooperativeMark";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Login screen. Layout only for now — submitting doesn't call the API
 * yet (there's no backend auth endpoint to call), but the form shape
 * matches the locked PRD decision: identifier is EMAIL OR PHONE NUMBER
 * (not a separate "username" concept), plus a PIN rather than a
 * password.
 *
 * Two-panel "wave card" layout — a green-to-gold curved panel beside a
 * clean form panel — replacing the earlier full-bleed landscape +
 * frosted-glass treatment. The curve is a single CSS border-radius
 * bulge on the panel's own edge (border-top/bottom-right-radius,
 * elliptical) rather than an SVG cutout, so it stays crisp and scales
 * with the card at any size.
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-cream px-4 py-10">
      {/* soft blob accents behind the card — depth without a literal
          illustration */}
      <div
        aria-hidden="true"
        className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-green/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-brand-gold/20 blur-3xl"
      />

      <ThemeToggle className="absolute right-5 top-5 z-10" />

      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-brand-cream shadow-2xl ring-1 ring-brand-line md:flex-row">
        {/* colored panel — identity + welcome copy */}
        <div className="relative flex w-full flex-col justify-between gap-10 rounded-b-[3rem] bg-gradient-to-br from-brand-green via-brand-green-dark to-brand-gold-dark p-8 text-brand-cream md:w-[42%] md:rounded-b-none md:rounded-tr-[55%_100%] md:rounded-br-[55%_100%] md:p-10">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md">
              <CooperativeMark className="h-9 w-9" />
            </div>
            <h2 className="font-heading mt-6 text-2xl font-bold">
              Welcome Back!
            </h2>
            <p className="mt-2 max-w-[220px] text-sm text-brand-cream/80">
              Onward Abeokuta-West Cooperative Management System
            </p>
          </div>
          <p className="text-xs tracking-wide text-brand-cream/60">
            A society of societies
          </p>
        </div>

        {/* form panel */}
        <div className="flex w-full flex-col justify-center p-8 md:w-[58%] md:p-12">
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
        </div>
      </div>
    </main>
  );
}
