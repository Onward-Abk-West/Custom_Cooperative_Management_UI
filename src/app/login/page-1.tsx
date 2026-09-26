"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiPost, setAccessToken, ApiError } from "@/lib/api-client";

/**
 * Login screen. Calls POST /api/v1/auth/login (AbkWestCoop.Api's
 * AuthController) with the PRD-locked shape: identifier is EMAIL OR
 * PHONE NUMBER (not a separate "username" concept), plus a PIN rather
 * than a password. Field names (EmailOrPhoneNumber, Pin) must match
 * AbkWestCoop.Contracts' PinLoginRequest record exactly.
 */
interface PinLoginResponseData {
  userId: string;
  societyId: string | null;
  email: string;
  phoneNumber: string;
  roles: string[];
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  refreshTokenExpiresAtUtc: string;
}

interface PinLoginResponse {
  success: boolean;
  code: string;
  message: string;
  data: PinLoginResponseData | null;
}

const SESSION_COOKIE = "onward_session";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Diagnostic: if this never appears in the console, the click isn't
    // reaching this function at all (e.g. a stale/unhydrated bundle, or
    // something else swallowing the submit) — everything below this line
    // is irrelevant in that case. Safe to remove once login is confirmed
    // working end-to-end on the live deployment.
    console.log("[login] handleSubmit fired", {
      hasIdentifier: identifier.trim().length > 0,
      pinLength: pin.length,
    });

    if (!identifier.trim() || !pin.trim()) {
      setError("Please enter both your email or phone number and PIN.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const response = await apiPost<PinLoginResponse>(
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

      setAccessToken(response.data.accessToken);
      // proxy.ts only checks for this cookie's presence to gate the app
      // shell — it isn't the httpOnly refresh-token cookie (the backend
      // currently returns the refresh token in the JSON body, not as a
      // Set-Cookie header), just a client-set marker so navigation past
      // the login screen works.
      document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

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

      {/*
        noValidate: without this, the browser's own HTML5 "required"
        check can block submission before onSubmit ever runs — no
        console output, no network request, just a small native tooltip
        near the empty field. That failure mode is indistinguishable
        from "nothing happens" unless you're looking right at the input.
        handleSubmit now does the same required-field check itself and
        surfaces it as a normal inline error instead.
      */}
      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
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
        First time signing in? Use the PIN issued by your society&apos;s
        Admin or Supervisor.
      </p>
    </AuthCard>
  );
}
