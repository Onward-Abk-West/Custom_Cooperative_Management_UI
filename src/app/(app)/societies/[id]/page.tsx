"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { getSociety, type SocietySummary } from "@/lib/api/societies";
import { createMemberAsDeveloperSuperadmin, type CreatedMemberData } from "@/lib/api/members";
import {
  assignSupervisor,
  assignPresident,
  revokeSupervisor,
  revokePresident,
  isConfirmationRequired,
  type AssignmentResult,
  type SocietyRoleScope,
} from "@/lib/api/society-assignments";
import type { ApiEnvelope } from "@/lib/api-client";
import { readSessionInfo } from "@/lib/session";

/**
 * Society detail: GET /api/v1/societies/{id}, plus the write actions
 * scoped to whichever role is viewing (Developer Superadmin or Onward
 * Superadmin — a Supervisor only ever sees their own society via the
 * sidebar's non-switcher path and doesn't get this admin view).
 *
 * Two real gaps in the current backend surface shape this page:
 *  - There is no "who is this society's current Supervisor/President"
 *    read endpoint, and no "list members of a society" endpoint either.
 *    So assignment is a raw User ID (GUID) field, not a picker — the
 *    only way to *discover* a member's ID today is from the response of
 *    creating them (shown right after "Create member" below) or from
 *    GET /api/v1/members/{id} if it's already known.
 *  - Only Developer Superadmin can create a member into an arbitrary
 *    society (POST .../developer-superadmin/societies/{id}/members).
 *    Onward Superadmin has no create-member endpoint at all — only
 *    assign/revoke Supervisor and President — so that form only renders
 *    for a Developer Superadmin viewer.
 */
export default function SocietyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: societyId } = usePromise(params);
  const scope: SocietyRoleScope =
    readSessionInfo()?.role === "developer_superadmin"
      ? "developer-superadmin"
      : "onward-superadmin";
  const canCreateMembers = scope === "developer-superadmin";

  const [society, setSociety] = useState<SocietySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSociety(societyId)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setLoadError(response.message || "Society not found.");
          return;
        }
        setSociety(response.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message || "Society not found." : "Could not reach the server."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId]);

  if (loading) {
    return <div className="text-sm text-brand-ink/60">Loading society…</div>;
  }

  if (loadError || !society) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {loadError || "Society not found."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/societies" className="text-sm font-medium text-brand-gold-dark hover:underline">
          ← All societies
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-bold text-brand-ink">
          {society.name}
        </h1>
        <p className="mt-1 font-mono text-xs text-brand-ink/50">{society.id}</p>
      </div>

      {canCreateMembers && <CreateMemberCard societyId={societyId} />}

      <RoleAssignmentCard
        title="Supervisor"
        description="One Supervisor per society. Assigning a new Supervisor when one already exists — or when the target member currently holds President — requires confirming the change."
        assign={(userId, confirm) => assignSupervisor(scope, societyId, userId, confirm)}
        revoke={() => revokeSupervisor(scope, societyId)}
      />

      <RoleAssignmentCard
        title="President"
        description="One President per society, mutually exclusive with Supervisor. Assigning a new President when one already exists requires confirming the change."
        assign={(userId, confirm) => assignPresident(scope, societyId, userId, confirm)}
        revoke={() => revokePresident(scope, societyId)}
      />
    </div>
  );
}

function CreateMemberCard({ societyId }: { societyId: string }) {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedMemberData | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await createMemberAsDeveloperSuperadmin(societyId, email, phoneNumber);
      if (!response.success || !response.data) {
        setError(response.message || "The member could not be created.");
        return;
      }
      setCreated(response.data);
      setEmail("");
      setPhoneNumber("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || "The member could not be created." : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-brand-ink">Create member</h2>
      <p className="mt-1 text-sm text-brand-ink/60">
        Issues a temporary credential the new member exchanges for their own PIN at{" "}
        <span className="font-medium">/first-time-signin</span>.
      </p>

      {created && (
        <div className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm">
          <p className="font-semibold text-brand-ink">Member created.</p>
          <p className="mt-1 text-brand-ink/70">
            User ID: <span className="font-mono text-xs">{created.userId}</span>
          </p>
          <p className="mt-1 text-brand-ink/70">
            Temporary credential (share this with the member — it expires{" "}
            {new Date(created.temporaryCredentialExpiresAtUtc).toLocaleString()}):
          </p>
          <p className="mt-1 select-all break-all rounded-lg bg-white/60 px-3 py-2 font-mono text-xs text-brand-ink">
            {created.temporaryCredential}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            id={`member-email-${societyId}`}
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
          />
        </div>
        <div className="flex-1">
          <Input
            id={`member-phone-${societyId}`}
            label="Phone number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+234…"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}

function RoleAssignmentCard({
  title,
  description,
  assign,
  revoke,
}: {
  title: string;
  description: string;
  assign: (userId: string, confirm: boolean) => Promise<AssignmentResult>;
  revoke: () => Promise<ApiEnvelope<unknown>>;
}) {
  const [userId, setUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    reason: string;
    userId: string;
  } | null>(null);

  async function doAssign(targetUserId: string, confirm: boolean) {
    setError(null);
    setSubmitting(true);
    try {
      const response = await assign(targetUserId, confirm);
      if (!response.success) {
        setError(response.message || `${title} could not be assigned.`);
        return;
      }
      if (isConfirmationRequired(response.data)) {
        setConfirmState({ reason: response.data.reason, userId: targetUserId });
        return;
      }
      setNotice(response.message || `${title} assigned.`);
      setConfirmState(null);
      setUserId("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || `${title} could not be assigned.` : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) {
      setError("Enter the member's User ID.");
      return;
    }
    setNotice(null);
    await doAssign(userId.trim(), false);
  }

  async function handleRevoke() {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const response = await revoke();
      if (!response.success) {
        setError(response.message || `${title} could not be revoked.`);
        return;
      }
      setNotice(response.message || `${title} revoked.`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || `${title} could not be revoked.` : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-brand-ink">{title}</h2>
      <p className="mt-1 text-sm text-brand-ink/60">{description}</p>

      {confirmState ? (
        <div className="mt-4 rounded-xl border border-amber-400/50 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Confirm this change ({confirmState.reason})</p>
          <p className="mt-1">
            This will replace whoever currently holds the {title} role for this society. Confirm to proceed.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              disabled={submitting}
              onClick={() => doAssign(confirmState.userId, true)}
            >
              {submitting ? "Confirming…" : "Confirm replacement"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmState(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAssignSubmit} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id={`${title}-user-id`}
              label="Member User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Assigning…" : `Assign ${title}`}
          </Button>
          <Button type="button" variant="outline" disabled={submitting} onClick={handleRevoke}>
            {submitting ? "…" : `Revoke ${title}`}
          </Button>
        </form>
      )}

      {notice && <p className="mt-2 text-sm text-brand-green">{notice}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
