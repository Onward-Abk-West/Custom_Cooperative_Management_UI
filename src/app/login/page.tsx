"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiPost, ApiError, type ApiEnvelope } from "@/lib/api-client";
import { establishSession, type AuthSessionData } from "@/lib/session";

/**
 * Login screen. Calls POST /api/v1/auth/login (AbkWestCoop.Api's
 * AuthController) with the PRD-locked shape: identifier is EMAIL OR
 * PHONE NUMBER (not a separate "username" concept), plus a PIN rather
 * than a password. Field names (EmailOrPhoneNumber, Pin) must match
 * AbkWestCoop.Contracts' PinLoginRequest record exactly.
 *
 * A brand-new member (created by a Developer Superadmin or Supervisor)
 * doesn't have a PIN yet and can't use this form at all — they go
 * through /first-time-signin with the temporary credential they were
 * issued instead. See that page and src/lib/api/first-time-auth.ts.
 */
export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiPost<ApiEnvelope<AuthSessionData>>(
        "/api/v1/auth/login",
        { EmailOrPhoneNumber: identifier, Pin: pin },
        // Skip apiFetch's automatic 401 -> refresh -> retry cycle here:
        // that path is for an expired session on an already-signed-in
        // call, not a wrong-PIN attempt on the login form itself.
        { skipAuthRetry: true }
      );

      if (!response.success || !response.data) {
        setError(response.message || "The email/phone number or PIN provided is incorrect.");
        return;
      }

      establishSession(response.data);

      // Read "next" from the URL directly (rather than useSearchParams)
      // so this page doesn't need a Suspense boundary just for the
      // post-login redirect target — proxy.ts sets this query param
      // when it bounces an unauthenticated visitor here.
      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      router.push(next);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "The email/phone number or PIN provided is incorrect."
            : err.message || "Something went wrong. Please try again."
        );
      } else {
        setError("Could not reach the server. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
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

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-brand-ink/50">
        First time signing in?{" "}
        <a
          href="/first-time-signin"
          className="font-medium text-brand-gold-dark hover:underline"
        >
          Set up your PIN
        </a>{" "}
        with the temporary credential your society&apos;s Admin or
        Supervisor gave you.
      </p>
    </AuthCard>
  );
}
