"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { verifyPinReset, completePinReset } from "@/lib/api/pin-reset";

/**
 * PIN reset, redemption half. This is NOT a self-service "email me a
 * reset link" screen — per AbkWestCoop.Api's PinResetControllers.cs,
 * a PIN reset starts with the Member requesting one while signed in
 * (see (app)/records/page.tsx and api/pin-reset.ts's requestPinReset),
 * then a Supervisor/President/Developer Superadmin/Onward Superadmin
 * approves it (the "PIN Reset Requests" nav item, /pin-resets) and
 * hands the member a one-time reset credential out of band — the same
 * pattern as a newly created member's temporary credential.
 *
 * This page is where that reset credential gets spent: two steps
 * against POST /api/v1/auth/pin-reset/verify and .../complete, mirroring
 * /first-time-signin's shape exactly. Unlike first-time PIN setup,
 * completing a reset does NOT return a session — the member signs in
 * normally at /login afterward with their new PIN.
 */

type Step = "credential" | "pin" | "done";

export default function ForgotPinPage() {
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
      setError("Enter the reset credential your Supervisor or President gave you.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await verifyPinReset(credential.trim());
      if (!response.success || !response.data) {
        setError(response.message || "That reset credential could not be verified.");
        return;
      }
      setPinSetupToken(response.data.pinSetupToken);
      setStep("pin");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "That reset credential could not be verified."
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
      setError("Your session expired — start over with your reset credential.");
      setStep("credential");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await completePinReset(pinSetupToken, pin);
      if (!response.success) {
        setError(response.message || "Your PIN could not be reset.");
        return;
      }
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Your PIN could not be reset.");
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

  if (step === "done") {
    return (
      <AuthCard
        panelTitle="All set!"
        panelSubtitle="Onward Abeokuta-West Cooperative Management System"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
          PIN reset
        </p>
        <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
          Your PIN has been reset
        </h1>
        <p className="mt-3 text-sm text-brand-ink/70">
          Sign in with your email or phone number and your new PIN.
        </p>
        <Button type="button" onClick={() => router.push("/login")} className="mt-8">
          Back to sign in
        </Button>
      </AuthCard>
    );
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
          Choose a new PIN
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
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "Resetting…" : "Reset PIN"}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      panelTitle="Forgot your PIN?"
      panelSubtitle="Onward Abeokuta-West Cooperative Management System"
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
        Step 1 of 2
      </p>
      <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
        Enter your reset credential
      </h1>
      <p className="mt-2 text-sm text-brand-ink/60">
        Ask your society&apos;s Supervisor or President to approve a PIN
        reset for you — they&apos;ll give you a one-time reset credential
        to enter here. (If you&apos;re still signed in, you can request one
        yourself from My Records.)
      </p>

      <form onSubmit={handleCredentialSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Input
          id="credential"
          name="credential"
          type="text"
          label="Reset credential"
          hideLabel
          autoComplete="one-time-code"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          placeholder="Reset credential"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Verifying…" : "Continue"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-brand-ink/50">
        Remembered it?{" "}
        <a href="/login" className="font-medium text-brand-gold-dark hover:underline">
          Back to sign in
        </a>
      </p>
    </AuthCard>
  );
}
