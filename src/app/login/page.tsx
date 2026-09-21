"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Login screen. Layout only for now — submitting doesn't call the API
 * yet (there's no backend auth endpoint to call — once there is, this
 * becomes an apiPost("/auth/login", ...) from src/lib/api-client.ts),
 * but the form shape matches the locked PRD decision: identifier is
 * EMAIL OR PHONE NUMBER (not a separate "username" concept), plus a
 * PIN rather than a password.
 */
export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: apiPost("/auth/login", { identifier, pin }) once the
    // backend endpoint exists.
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
        <Input
          id="identifier"
          name="identifier"
          type="text"
          label="Email or phone number"
          hideLabel
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Email or phone number"
        />

        <Input
          id="pin"
          name="pin"
          type="password"
          label="PIN"
          hideLabel
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="current-password"
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="PIN"
          className="tracking-[0.4em] placeholder:tracking-normal"
        />

        <div className="-mt-1 text-right">
          <a
            href="/forgot-pin"
            className="text-xs font-medium text-brand-gold-dark hover:underline"
          >
            Forgot your PIN?
          </a>
        </div>

        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-brand-ink/50">
        First time signing in? Use the PIN issued by your society&apos;s
        Admin or Supervisor.
      </p>
    </AuthCard>
  );
}
