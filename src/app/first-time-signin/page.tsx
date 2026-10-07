"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { establishSession } from "@/lib/session";
import {
  authenticateFirstTimeMember,
  completeFirstTimePinSetup,
} from "@/lib/api/first-time-auth";

/**
 * First-time PIN setup for a brand-new member. Two steps against two
 * endpoints on AbkWestCoop.Api's FirstTimeAuthenticationController:
 *
 *   1. Exchange the temporary credential (issued when a Developer
 *      Superadmin or Supervisor created this member — see
 *      src/lib/api/members.ts) for a short-lived pinSetupToken.
 *   2. Spend that token, plus a new 4-digit PIN the member chooses
 *      here, to create the PIN and receive a full session — the same
 *      session shape login/page.tsx gets, established the same way.
 *
 * There's no username/PIN pair yet at step 1 (that's the whole point:
 * this is how one gets created), so this page never touches
 * src/lib/roles.ts or the app shell — it's public, alongside /login
 * and /forgot-pin.
 */

type Step = "credential" | "pin";

export default function FirstTimeSignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credential");
  const [credential, setCredential] = useState("");
  const [pinSetupToken, setPinSetupToken] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!credential.trim()) {
      setError("Enter the temporary credential you were given.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await authenticateFirstTimeMember(credential.trim());
      if (!response.success || !response.data) {
        setError(response.message || "That credential could not be verified.");
        return;
      }
      setPinSetupToken(response.data.pinSetupToken);
      setStep("pin");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "That credential could not be verified."
          : "Could not reach the server. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("Your PIN must be exactly four digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("Both PINs must match.");
      return;
    }
    if (!pinSetupToken) {
      // Shouldn't be reachable (step "pin" only renders once this is
      // set), but a stale/expired token error from the server is
      // still handled below in the catch block.
      setError("Your session expired — start over with your temporary credential.");
      setStep("credential");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await completeFirstTimePinSetup(pinSetupToken, pin);
      if (!response.success || !response.data) {
        setError(response.message || "Your PIN could not be created.");
        return;
      }
      establishSession(response.data);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Your PIN could not be created.");
        // An expired/used/invalid setup authorization can't be retried
        // with a new PIN — the member has to start over from their
        // temporary credential.
        if (err.status === 401) {
          setStep("credential");
          setPinSetupToken(null);
          setPin("");
          setConfirmPin("");
        }
      } else {
        setError("Could not reach the server. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "pin") {
    return (
      <AuthCard
        panelTitle="Almost done!"
        panelSubtitle="Onward Abeokuta-West Cooperative Management System"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
          Step 2 of 2
        </p>
        <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
          Create your PIN
        </h1>
        <p className="mt-2 text-sm text-brand-ink/60">
          Choose a four-digit PIN. You&apos;ll use it with your email or
          phone number to sign in from now on.
        </p>

        <form onSubmit={handlePinSubmit} noValidate className="mt-8 flex flex-col gap-4">
          <Input
            id="pin"
            name="pin"
            type="password"
            label="New PIN"
            hideLabel
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="new-password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="New PIN"
            className="tracking-[0.4em] placeholder:tracking-normal"
          />

          <Input
            id="confirm-pin"
            name="confirmPin"
            type="password"
            label="Confirm PIN"
            hideLabel
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="new-password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Confirm PIN"
            className="tracking-[0.4em] placeholder:tracking-normal"
          />

          {error && (
            <p role="alert" className="text-sm font-semibold text-status-bad">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "Creating your PIN…" : "Create PIN and sign in"}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      panelTitle="Welcome!"
      panelSubtitle="Onward Abeokuta-West Cooperative Management System"
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
        Step 1 of 2
      </p>
      <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
        Set up your account
      </h1>
      <p className="mt-2 text-sm text-brand-ink/60">
        Enter the temporary credential your society&apos;s Admin or
        Supervisor gave you.
      </p>

      <form onSubmit={handleCredentialSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Input
          id="credential"
          name="credential"
          type="text"
          label="Temporary credential"
          hideLabel
          autoComplete="one-time-code"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          placeholder="Temporary credential"
        />

        {error && (
          <p role="alert" className="text-sm font-semibold text-status-bad">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Verifying…" : "Continue"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-brand-ink/50">
        Already have a PIN?{" "}
        <a href="/login" className="font-medium text-brand-gold-dark hover:underline">
          Back to sign in
        </a>
      </p>
    </AuthCard>
  );
}
