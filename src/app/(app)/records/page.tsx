"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { getMyProfile, type MemberProfileData } from "@/lib/api/members";

/**
 * "My Records" (see src/lib/roles.ts's NAV_ITEMS) — a Member's own
 * profile. GET /api/v1/members/me is Member-role only on the backend;
 * there's no self-service edit endpoint for a Member (PUT
 * /api/v1/members/{id} is Developer Superadmin / Supervisor only), so
 * this is read-only. A Member who wants their email/phone changed goes
 * through their society's Supervisor, same as a PIN reset.
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
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold text-brand-ink">My Records</h1>

      {loading && <p className="text-sm text-brand-ink/60">Loading…</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {profile && (
        <dl className="grid max-w-lg grid-cols-1 gap-4 rounded-2xl border border-brand-line bg-surface-card p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink/50">Email</dt>
            <dd className="mt-1 text-sm text-brand-ink">{profile.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink/50">Phone number</dt>
            <dd className="mt-1 text-sm text-brand-ink">{profile.phoneNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink/50">Roles</dt>
            <dd className="mt-1 text-sm text-brand-ink">{profile.roles.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink/50">User ID</dt>
            <dd className="mt-1 font-mono text-xs text-brand-ink/60">{profile.userId}</dd>
          </div>
        </dl>
      )}

      <p className="text-xs text-brand-ink/50">
        Need something here corrected? Your society&apos;s Supervisor can update it.
      </p>
    </div>
  );
}
