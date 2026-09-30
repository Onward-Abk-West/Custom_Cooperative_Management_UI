"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { createMemberAsSupervisor, type CreatedMemberData } from "@/lib/api/members";
import {
  assignPresident,
  revokePresident,
  isConfirmationRequired,
} from "@/lib/api/society-assignments";
import { readSessionInfo } from "@/lib/session";

/**
 * "Members" (see src/lib/roles.ts's NAV_ITEMS). There is currently no
 * "list members of a society" endpoint on the backend — only
 * GET /api/v1/members/{id} for one member at a time — so this can't be
 * a real list/table the way /societies is. This is a lookup-by-ID form
 * (paste a User ID — you get one back whenever a member is created — to
 * jump to that member's record), plus, for a Supervisor specifically,
 * their own two write actions that have no other home in the nav:
 * creating a member directly into their own society (no societyId
 * needed — POST /api/v1/supervisor/members is implicitly scoped), and
 * assigning/revoking their society's President.
 */
export default function MembersLookupPage() {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [isSupervisor, setIsSupervisor] = useState(false);

  useEffect(() => {
    setIsSupervisor(readSessionInfo()?.role === "supervisor");
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId.trim()) return;
    router.push(`/members/${memberId.trim()}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-ink">Members</h1>
        <p className="mt-2 max-w-lg text-sm text-brand-ink/60">
          There&apos;s no member directory yet on the backend — only a lookup by User ID. Paste
          one below (you&apos;ll get one back whenever a member is created) to view or edit
          their record.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-4 flex max-w-lg flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id="member-lookup-id"
              label="Member User ID"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <Button type="submit">View member</Button>
        </form>
      </div>

      {isSupervisor && (
        <>
          <SupervisorCreateMemberCard />
          <SupervisorPresidentCard />
        </>
      )}
    </div>
  );
}

function SupervisorCreateMemberCard() {
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
      const response = await createMemberAsSupervisor(email, phoneNumber);
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
    <section className="max-w-lg rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-brand-ink">Create member in your society</h2>
      {created && (
        <div className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm">
          <p className="font-semibold text-brand-ink">Member created.</p>
          <p className="mt-1 text-brand-ink/70">
            User ID: <span className="font-mono text-xs">{created.userId}</span>
          </p>
          <p className="mt-1 text-brand-ink/70">
            Temporary credential (expires {new Date(created.temporaryCredentialExpiresAtUtc).toLocaleString()}):
          </p>
          <p className="mt-1 select-all break-all rounded-lg bg-white/60 px-3 py-2 font-mono text-xs text-brand-ink">
            {created.temporaryCredential}
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input id="supervisor-member-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@example.com" />
        </div>
        <div className="flex-1">
          <Input id="supervisor-member-phone" label="Phone number" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+234…" />
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

function SupervisorPresidentCard() {
  const societyId = readSessionInfo()?.societyId ?? "";
  const [userId, setUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReason, setConfirmReason] = useState<string | null>(null);

  async function doAssign(confirm: boolean) {
    if (!societyId) {
      setError("Your society could not be determined from your session — try signing in again.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await assignPresident("supervisor", societyId, userId.trim(), confirm);
      if (!response.success) {
        setError(response.message || "President could not be assigned.");
        return;
      }
      if (isConfirmationRequired(response.data)) {
        setConfirmReason(response.data.reason);
        return;
      }
      setNotice(response.message || "President assigned.");
      setConfirmReason(null);
      setUserId("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || "President could not be assigned." : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke() {
    if (!societyId) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const response = await revokePresident("supervisor", societyId);
      if (!response.success) {
        setError(response.message || "President could not be revoked.");
        return;
      }
      setNotice(response.message || "President revoked.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || "President could not be revoked." : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-lg rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-brand-ink">President</h2>
      <p className="mt-1 text-sm text-brand-ink/60">
        Assign or revoke your society&apos;s President — mutually exclusive with Supervisor.
      </p>

      {confirmReason ? (
        <div className="mt-4 rounded-xl border border-amber-400/50 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Confirm this change ({confirmReason})</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" disabled={submitting} onClick={() => doAssign(true)}>
              {submitting ? "Confirming…" : "Confirm replacement"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmReason(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!userId.trim()) {
              setError("Enter the member's User ID.");
              return;
            }
            setNotice(null);
            doAssign(false);
          }}
          noValidate
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Input id="president-user-id" label="Member User ID" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Assigning…" : "Assign President"}
          </Button>
          <Button type="button" variant="outline" disabled={submitting} onClick={handleRevoke}>
            Revoke President
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
