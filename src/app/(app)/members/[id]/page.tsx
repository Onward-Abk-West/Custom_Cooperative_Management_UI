"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { getMemberProfile, updateMemberProfile, type MemberProfileData } from "@/lib/api/members";
import {
  changeMemberStatus,
  MEMBER_STATUS_VALUES,
  type MemberStatusValue,
} from "@/lib/api/member-status";
import {
  reissueMemberTemporaryCredential,
  type ReissuedCredentialData,
} from "@/lib/api/member-temporary-credentials";
import { assignSocietyAdmin, revokeSocietyAdmin } from "@/lib/api/society-admins";
import { readSessionInfo } from "@/lib/session";
import type { Role } from "@/lib/roles";

type MemberManagementScope = "supervisor" | "developer-superadmin" | "onward-superadmin";

function managementScopeForRole(role: Role | null): MemberManagementScope | null {
  switch (role) {
    case "supervisor":
      return "supervisor";
    case "developer_superadmin":
      return "developer-superadmin";
    case "onward_superadmin":
      return "onward-superadmin";
    default:
      return null;
  }
}

/**
 * GET /api/v1/members/{id} — Developer Superadmin, Onward Superadmin,
 * Supervisor, President, Admin. PUT is narrower (Developer Superadmin,
 * Supervisor only): the edit form below always renders, and a viewer
 * who can see but not edit finds out via a 403 from the API on submit
 * — this page doesn't duplicate that role matrix client-side.
 *
 * Three further write actions below the edit form — status change,
 * Admin role assignment, temporary-credential reissue — are each
 * narrower still: Supervisor (own society), Developer Superadmin or
 * Onward Superadmin (any society) only. Admin and President can view
 * this page but see none of these three cards, matching the backend's
 * [Authorize] lists on MemberStatusControllers, SocietyAdminsControllers
 * and MemberTemporaryCredentialsControllers — none of the three has an
 * Admin- or President-facing controller at all.
 */
export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: memberId } = usePromise(params);
  const [profile, setProfile] = useState<MemberProfileData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [scope, setScope] = useState<MemberManagementScope | null>(null);

  useEffect(() => {
    setScope(managementScopeForRole(readSessionInfo()?.role ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMemberProfile(memberId)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setLoadError(response.message || "Member not found.");
          return;
        }
        setProfile(response.data);
        setName(response.data.name ?? "");
        setEmail(response.data.email ?? "");
        setPhoneNumber(response.data.phoneNumber ?? "");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message || "Member not found." : "Could not reach the server."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const response = await updateMemberProfile(memberId, name, email, phoneNumber);
      if (!response.success || !response.data) {
        setSaveError(response.message || "The profile could not be updated.");
        return;
      }
      setProfile(response.data);
      setSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message || "The profile could not be updated."
          : "Could not reach the server."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-brand-ink/60">Loading member…</p>;
  }

  if (loadError || !profile) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {loadError || "Member not found."}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <Link href="/members" className="text-sm font-medium text-brand-gold-dark hover:underline">
          ← Look up another member
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-bold text-brand-ink">
          {profile.name || profile.email || profile.phoneNumber || "Member"}
        </h1>
        <p className="mt-1 text-sm text-brand-ink/60">Roles: {profile.roles.join(", ") || "—"}</p>
        <p className="mt-1 text-sm text-brand-ink/60">Status: {profile.status}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-brand-line bg-surface-card p-5">
        <Input
          id="member-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          id="member-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="member-phone"
          label="Phone number"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        {saveError && (
          <p role="alert" className="text-sm text-red-600">
            {saveError}
          </p>
        )}
        {saved && <p className="text-sm text-brand-green">Saved.</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      {scope && (
        <>
          <MemberStatusCard
            scope={scope}
            societyId={profile.societyId}
            memberId={memberId}
            currentStatus={profile.status}
            onChanged={(status) => setProfile((p) => (p ? { ...p, status } : p))}
          />
          <AdminRoleCard
            scope={scope}
            societyId={profile.societyId}
            memberId={memberId}
            roles={profile.roles}
            onChanged={(roles) => setProfile((p) => (p ? { ...p, roles } : p))}
          />
          <ReissueCredentialCard scope={scope} societyId={profile.societyId} memberId={memberId} />
        </>
      )}
    </div>
  );
}

function MemberStatusCard({
  scope,
  societyId,
  memberId,
  currentStatus,
  onChanged,
}: {
  scope: MemberManagementScope;
  societyId: string;
  memberId: string;
  currentStatus: string;
  onChanged: (status: string) => void;
}) {
  const initialStatus = (MEMBER_STATUS_VALUES as readonly string[]).includes(currentStatus)
    ? (currentStatus as MemberStatusValue)
    : MEMBER_STATUS_VALUES[0];
  const [status, setStatus] = useState<MemberStatusValue>(initialStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (status === currentStatus) {
      setError("Select a different status to change it.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await changeMemberStatus(scope, societyId, memberId, status);
      if (!response.success || !response.data) {
        setError(response.message || "The member's status could not be changed.");
        return;
      }
      onChanged(response.data.status);
      setNotice(response.message || "Status changed.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "The member's status could not be changed."
          : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-brand-ink">Status</h2>
      <p className="mt-1 text-sm text-brand-ink/60">Currently: {currentStatus}.</p>
      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="member-status" className="mb-1 block text-sm font-medium text-brand-ink">
            New status
          </label>
          <select
            id="member-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MemberStatusValue)}
            className="w-full rounded-full border border-brand-line bg-brand-line/25 px-5 py-3 text-sm text-brand-ink outline-none focus:border-brand-gold focus:bg-white focus:ring-2 focus:ring-brand-gold/30"
          >
            {MEMBER_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Changing…" : "Change status"}
        </Button>
      </form>
      {notice && <p className="mt-2 text-sm text-brand-green">{notice}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}

function AdminRoleCard({
  scope,
  societyId,
  memberId,
  roles,
  onChanged,
}: {
  scope: MemberManagementScope;
  societyId: string;
  memberId: string;
  roles: string[];
  onChanged: (roles: string[]) => void;
}) {
  const isAdmin = roles.includes("Admin");
  const eligible = isAdmin || roles.includes("Member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!eligible) {
    return null;
  }

  async function handleToggle() {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const response = isAdmin
        ? await revokeSocietyAdmin(scope, societyId, memberId)
        : await assignSocietyAdmin(scope, societyId, memberId);
      if (!response.success) {
        setError(response.message || "The Admin role could not be changed.");
        return;
      }
      onChanged(isAdmin ? roles.filter((r) => r !== "Admin") : [...roles, "Admin"]);
      setNotice(response.message || (isAdmin ? "Admin role revoked." : "Admin role assigned."));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "The Admin role could not be changed."
          : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-brand-ink">Admin role</h2>
      <p className="mt-1 text-sm text-brand-ink/60">
        {isAdmin
          ? "This member is an Admin for this society."
          : "Grant this member the Admin role for this society."}
      </p>
      <Button
        type="button"
        variant={isAdmin ? "outline" : undefined}
        disabled={submitting}
        onClick={handleToggle}
        className="mt-4"
      >
        {submitting ? "…" : isAdmin ? "Revoke Admin" : "Make Admin"}
      </Button>
      {notice && <p className="mt-2 text-sm text-brand-green">{notice}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}

function ReissueCredentialCard({
  scope,
  societyId,
  memberId,
}: {
  scope: MemberManagementScope;
  societyId: string;
  memberId: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credential, setCredential] = useState<ReissuedCredentialData | null>(null);

  async function handleReissue() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await reissueMemberTemporaryCredential(scope, societyId, memberId);
      if (!response.success || !response.data) {
        setError(response.message || "The temporary credential could not be reissued.");
        return;
      }
      setCredential(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "The temporary credential could not be reissued."
          : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-brand-ink">Temporary credential</h2>
      <p className="mt-1 text-sm text-brand-ink/60">
        Re-issue a first-time-PIN-setup credential if the member never completed onboarding and
        the original was lost or expired. Rejected once the member has already set their own PIN.
      </p>

      {credential && (
        <div className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm">
          <p className="text-brand-ink/70">
            Temporary credential (expires{" "}
            {new Date(credential.temporaryCredentialExpiresAtUtc).toLocaleString()}):
          </p>
          <p className="mt-1 select-all break-all rounded-lg bg-white/60 px-3 py-2 font-mono text-xs text-brand-ink">
            {credential.temporaryCredential}
          </p>
        </div>
      )}

      <Button type="button" disabled={submitting} onClick={handleReissue} className="mt-4">
        {submitting ? "Reissuing…" : "Reissue temporary credential"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
