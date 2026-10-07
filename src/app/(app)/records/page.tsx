"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { getMyProfile, type MemberProfileData } from "@/lib/api/members";
import { requestPinReset, type PinResetRequestData } from "@/lib/api/pin-reset";
import {
  createProfileUpdateRequest,
  type ProfileUpdateRequestData,
} from "@/lib/api/profile-update-requests";

/**
 * "My Records" (see src/lib/roles.ts's NAV_ITEMS) — a Member's own
 * profile, plus the two self-service actions a Member has instead of
 * a direct edit: requesting a profile change and requesting a PIN
 * reset. GET /api/v1/members/me is Member-role only on the backend;
 * there's no self-service PUT (PUT /api/v1/members/{id} is Developer
 * Superadmin / Supervisor only), so a Member proposes changes via
 * POST /api/v1/members/me/profile-update-requests instead, reviewed by
 * an Admin (see (app)/profile-requests/page.tsx) — and requests a PIN
 * reset via POST /api/v1/members/me/pin-reset-requests, reviewed by a
 * Supervisor/President/superadmin (see (app)/pin-resets/page.tsx).
 * Neither has a "list my own requests" endpoint, so each card only
 * ever shows the outcome of its own most recent submission, not a
 * history.
 */
export default function RecordsPage() {
  const [profile, setProfile] = useState<MemberProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((response) => {
        if (!response.success || !response.data) {
          setError(response.message || "Your record could not be loaded.");
          return;
        }
        setProfile(response.data);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message || "Your record could not be loaded." : "Could not reach the server."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-bold text-heading">My Records</h1>

        {loading && <p className="text-sm text-brand-ink/60">Loading…</p>}
        {error && (
          <p role="alert" className="text-sm font-semibold text-status-bad">
            {error}
          </p>
        )}

        {profile && (
          <dl className="grid max-w-lg grid-cols-1 gap-4 rounded-2xl border border-brand-line bg-surface-card p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-heading">Name</dt>
              <dd className="mt-1 text-sm text-brand-ink">{profile.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-heading">Email</dt>
              <dd className="mt-1 text-sm text-brand-ink">{profile.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-heading">Phone number</dt>
              <dd className="mt-1 text-sm text-brand-ink">{profile.phoneNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-heading">Roles</dt>
              <dd className="mt-1 text-sm text-brand-ink">{profile.roles.join(", ") || "—"}</dd>
            </div>
          </dl>
        )}
      </div>

      <ProfileUpdateRequestCard />
      <PinResetRequestCard />
    </div>
  );
}

function ProfileUpdateRequestCard() {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProfileUpdateRequestData | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const response = await createProfileUpdateRequest(email, phoneNumber);
      if (!response.success || !response.data) {
        setError(response.message || "Your request could not be submitted.");
        return;
      }
      setResult(response.data);
      setEmail("");
      setPhoneNumber("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || "Your request could not be submitted." : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-lg rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-heading">Request a profile change</h2>
      <p className="mt-1 text-sm text-brand-ink/60">
        Propose a new email or phone number. Your society&apos;s Admin
        reviews and approves the change before it takes effect.
      </p>

      {result && (
        <div className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm">
          <p className="font-semibold text-brand-ink">Request submitted — {result.status.toLowerCase()}.</p>
          {result.proposedEmail && (
            <p className="mt-1 text-brand-ink/70">Proposed email: {result.proposedEmail}</p>
          )}
          {result.proposedPhoneNumber && (
            <p className="mt-1 text-brand-ink/70">Proposed phone: {result.proposedPhoneNumber}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input id="request-email" label="New email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@example.com" />
        </div>
        <div className="flex-1">
          <Input id="request-phone" label="New phone number" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+234…" />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit request"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}
    </section>
  );
}

function PinResetRequestCard() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PinResetRequestData | null>(null);

  async function handleRequest() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await requestPinReset();
      if (!response.success || !response.data) {
        setError(response.message || "Your PIN reset request could not be submitted.");
        return;
      }
      setResult(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "Your PIN reset request could not be submitted."
          : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-lg rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-heading">Request a PIN reset</h2>
      <p className="mt-1 text-sm text-brand-ink/60">
        Your society&apos;s Supervisor, President, or a superadmin approves
        the request, then hands you a one-time reset code to use at{" "}
        <a href="/login" className="font-medium text-brand-gold-dark hover:underline">
          /login
        </a>{" "}
        — enter your email or phone number there and the reset-code prompt comes up
        automatically.
      </p>

      {result && (
        <p className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm text-brand-ink">
          Request submitted — status: {result.status.toLowerCase()}.
        </p>
      )}

      <Button type="button" onClick={handleRequest} disabled={submitting} className="mt-4">
        {submitting ? "Requesting…" : "Request PIN reset"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}
    </section>
  );
}
