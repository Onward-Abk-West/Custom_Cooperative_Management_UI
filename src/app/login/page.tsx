"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiPost, ApiError, type ApiEnvelope } from "@/lib/api-client";
import { establishSession, type AuthSessionData } from "@/lib/session";
import { identifyAccount, LOGIN_STEP } from "@/lib/api/account-identify";
import {
  authenticateFirstTimeMember,
  completeFirstTimePinSetup,
} from "@/lib/api/first-time-auth";
import { verifyPinReset, completePinReset } from "@/lib/api/pin-reset";

/**
 * The single, dynamic sign-in entry point. A member only ever has to
 * remember one URL and one first move — enter the email or phone number
 * on their member record — and this page figures out the rest by calling
 * POST /api/v1/auth/identify (src/lib/api/account-identify.ts) and
 * branching on its answer:
 *
 *   - Pin              -> normal PIN login (POST /api/v1/auth/login)
 *   - FirstTime        -> enter the temporary credential an admin gave
 *                         them, then create a PIN (first-time-signin's
 *                         old job, folded in here)
 *   - PinResetCode     -> enter the one-time reset code an officer
 *                         approved, then choose a new PIN (forgot-pin's
 *                         old job, folded in here)
 *   - PinResetPending  -> they've already requested a reset but no
 *                         officer has approved it yet, so there's no
 *                         code to enter — just tell them to wait
 *
 * /first-time-signin and /forgot-pin now just redirect here (see their
 * page.tsx files) rather than being separate flows a member has to find
 * on their own — exactly the "remove the issue of looking for where
 * first-time login is" ask this page exists to satisfy. The three
 * existing redemption endpoints this page calls are untouched; only the
 * new /auth/identify call in front of them is new.
 */

type Step =
  | "identify"
  | "pin"
  | "firstTimeCredential"
  | "createPin"
  | "pinResetCredential"
  | "resetPin"
  | "resetDone"
  | "pinResetPending";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [credential, setCredential] = useState("");
  const [pinSetupToken, setPinSetupToken] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetToIdentify() {
    setStep("identify");
    setPin("");
    setCredential("");
    setPinSetupToken(null);
    setNewPin("");
    setConfirmNewPin("");
    setError(null);
  }

  function nextOrigin() {
    return new URLSearchParams(window.location.search).get("next") || "/dashboard";
  }

  async function handleIdentifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Enter the email or phone number on your member record.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await identifyAccount(identifier.trim());
      if (!response.success || !response.data) {
        setError(response.message || "We couldn't find that account.");
        return;
      }
      switch (response.data.nextStep) {
        case LOGIN_STEP.firstTime:
          setStep("firstTimeCredential");
          break;
        case LOGIN_STEP.pinResetCode:
          setStep("pinResetCredential");
          break;
        case LOGIN_STEP.pinResetPending:
          setStep("pinResetPending");
          break;
        default:
          setStep("pin");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 429
            ? "Too many attempts. Please wait a moment and try again."
            : err.message || "We couldn't find that account."
        );
      } else {
        setError("Could not reach the server. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiPost<ApiEnvelope<AuthSessionData>>(
        "/api/v1/auth/login",
        { EmailOrPhoneNumber: identifier, Pin: pin },
        { skipAuthRetry: true }
      );
      if (!response.success || !response.data) {
        setError(response.message || "The PIN provided is incorrect.");
        return;
      }
      establishSession(response.data);
      router.push(nextOrigin());
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "The PIN provided is incorrect." : err.message || "Something went wrong. Please try again.");
      } else {
        setError("Could not reach the server. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFirstTimeCredentialSubmit(e: React.FormEvent) {
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
      setStep("createPin");
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

  async function handleCreatePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.length !== 4) {
      setError("Your PIN must be exactly four digits.");
      return;
    }
    if (newPin !== confirmNewPin) {
      setError("Both PINs must match.");
      return;
    }
    if (!pinSetupToken) {
      setError("Your session expired — start over with your temporary credential.");
      setStep("firstTimeCredential");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await completeFirstTimePinSetup(pinSetupToken, newPin);
      if (!response.success || !response.data) {
        setError(response.message || "Your PIN could not be created.");
        return;
      }
      establishSession(response.data);
      router.push(nextOrigin());
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Your PIN could not be created.");
        if (err.status === 401) {
          setStep("firstTimeCredential");
          setPinSetupToken(null);
          setNewPin("");
          setConfirmNewPin("");
        }
      } else {
        setError("Could not reach the server. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePinResetCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!credential.trim()) {
      setError("Enter the reset code your Supervisor or President gave you.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await verifyPinReset(credential.trim());
      if (!response.success || !response.data) {
        setError(response.message || "That reset code could not be verified.");
        return;
      }
      setPinSetupToken(response.data.pinSetupToken);
      setStep("resetPin");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "That reset code could not be verified."
          : "Could not reach the server. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.length !== 4) {
      setError("Your PIN must be exactly four digits.");
      return;
    }
    if (newPin !== confirmNewPin) {
      setError("Both PINs must match.");
      return;
    }
    if (!pinSetupToken) {
      setError("Your session expired — start over with your reset code.");
      setStep("pinResetCredential");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await completePinReset(pinSetupToken, newPin);
      if (!response.success) {
        setError(response.message || "Your PIN could not be reset.");
        return;
      }
      setStep("resetDone");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Your PIN could not be reset.");
        if (err.status === 401) {
          setStep("pinResetCredential");
          setPinSetupToken(null);
          setNewPin("");
          setConfirmNewPin("");
        }
      } else {
        setError("Could not reach the server. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckPendingReset() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await identifyAccount(identifier.trim());
      if (response.success && response.data?.nextStep === LOGIN_STEP.pinResetCode) {
        setStep("pinResetCredential");
        return;
      }
      if (response.success && response.data?.nextStep === LOGIN_STEP.pin) {
        setStep("pin");
        return;
      }
      setError("Still awaiting approval. Please check back shortly.");
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const backToIdentify = (
    <p className="mt-6 text-center text-xs text-brand-ink/50">
      Not you?{" "}
      <button
        type="button"
        onClick={resetToIdentify}
        className="font-medium text-brand-gold-dark hover:underline"
      >
        Start over
      </button>
    </p>
  );

  if (step === "pinResetPending") {
    return (
      <AuthCard
        panelTitle="Almost there"
        panelSubtitle="Onward Abeokuta-West Cooperative Management System"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
          PIN reset
        </p>
        <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
          Your request is awaiting approval
        </h1>
        <p className="mt-3 text-sm text-brand-ink/70">
          You already asked for your PIN to be reset. Once your society&apos;s
          Supervisor or President approves it, come back here and you&apos;ll
          be asked for the reset code they give you.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-status-bad">
            {error}
          </p>
        )}

        <Button type="button" onClick={handleCheckPendingReset} disabled={submitting} className="mt-8">
          {submitting ? "Checking…" : "Check again"}
        </Button>
        {backToIdentify}
      </AuthCard>
    );
  }

  if (step === "resetDone") {
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
        <Button type="button" onClick={resetToIdentify} className="mt-8">
          Back to sign in
        </Button>
      </AuthCard>
    );
  }

  if (step === "createPin" || step === "resetPin") {
    const isFirstTime = step === "createPin";
    return (
      <AuthCard
        panelTitle="Almost done!"
        panelSubtitle="Onward Abeokuta-West Cooperative Management System"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
          Step 2 of 2
        </p>
        <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
          {isFirstTime ? "Create your PIN" : "Choose a new PIN"}
        </h1>
        <p className="mt-2 text-sm text-brand-ink/60">
          Choose a four-digit PIN. You&apos;ll use it with your email or
          phone number to sign in from now on.
        </p>

        <form
          onSubmit={isFirstTime ? handleCreatePinSubmit : handleResetPinSubmit}
          noValidate
          className="mt-8 flex flex-col gap-4"
        >
          <Input
            id="new-pin"
            name="newPin"
            type="password"
            label="New PIN"
            hideLabel
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="new-password"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="New PIN"
            className="tracking-[0.4em] placeholder:tracking-normal"
          />

          <Input
            id="confirm-new-pin"
            name="confirmNewPin"
            type="password"
            label="Confirm PIN"
            hideLabel
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="new-password"
            value={confirmNewPin}
            onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Confirm PIN"
            className="tracking-[0.4em] placeholder:tracking-normal"
          />

          {error && (
            <p role="alert" className="text-sm font-semibold text-status-bad">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "Saving…" : isFirstTime ? "Create PIN and sign in" : "Reset PIN"}
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (step === "firstTimeCredential" || step === "pinResetCredential") {
    const isFirstTime = step === "firstTimeCredential";
    return (
      <AuthCard
        panelTitle="Welcome!"
        panelSubtitle="Onward Abeokuta-West Cooperative Management System"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
          Step 1 of 2
        </p>
        <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
          {isFirstTime ? "Set up your account" : "Enter your reset code"}
        </h1>
        <p className="mt-2 text-sm text-brand-ink/60">
          {isFirstTime
            ? "Enter the temporary credential your society's Admin or Supervisor gave you."
            : "Enter the reset code your society's Supervisor or President gave you."}
        </p>

        <form
          onSubmit={isFirstTime ? handleFirstTimeCredentialSubmit : handlePinResetCredentialSubmit}
          noValidate
          className="mt-8 flex flex-col gap-4"
        >
          <Input
            id="credential"
            name="credential"
            type="text"
            label={isFirstTime ? "Temporary credential" : "Reset code"}
            hideLabel
            autoComplete="one-time-code"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder={isFirstTime ? "Temporary credential" : "Reset code"}
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
        {backToIdentify}
      </AuthCard>
    );
  }

  if (step === "pin") {
    return (
      <AuthCard
        panelTitle="Welcome back!"
        panelSubtitle="Onward Abeokuta-West Cooperative Management System"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
          Welcome
        </p>
        <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
          Enter your PIN
        </h1>
        <p className="mt-2 text-sm text-brand-ink/60">
          Signing in as <span className="font-medium text-brand-ink">{identifier}</span>.
        </p>

        <form onSubmit={handlePinSubmit} className="mt-8 flex flex-col gap-4">
          <Input
            id="pin"
            name="pin"
            type="password"
            label="PIN"
            hideLabel
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="current-password"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="PIN"
            className="tracking-[0.4em] placeholder:tracking-normal"
          />

          {error && (
            <p role="alert" className="text-sm font-semibold text-status-bad">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "Signing in…" : "Log in"}
          </Button>
        </form>
        {backToIdentify}
      </AuthCard>
    );
  }

  return (
    <AuthCard
      panelTitle="Welcome!"
      panelSubtitle="Onward Abeokuta-West Cooperative Management System"
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-dark">
        Welcome
      </p>
      <h1 className="font-heading mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
        Sign in to continue
      </h1>
      <p className="mt-2 text-sm text-brand-ink/60">
        Use the email or phone number on your member record. We&apos;ll take
        it from there — whether that&apos;s your PIN, a temporary credential,
        or a PIN reset code.
      </p>

      <form onSubmit={handleIdentifySubmit} className="mt-8 flex flex-col gap-4">
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

        {error && (
          <p role="alert" className="text-sm font-semibold text-status-bad">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Checking…" : "Continue"}
        </Button>
      </form>
    </AuthCard>
  );
}
