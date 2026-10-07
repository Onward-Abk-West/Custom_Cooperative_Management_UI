"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { getSociety, type SocietySummary } from "@/lib/api/societies";
import { createMemberAsDeveloperSuperadmin, type CreatedMemberData } from "@/lib/api/members";
import { readSessionInfo } from "@/lib/session";

/**
 * Society detail: GET /api/v1/societies/{id}, plus the write actions
 * scoped to whichever role is viewing (Developer Superadmin or Onward
 * Superadmin — a Supervisor only ever sees their own society via the
 * sidebar's non-switcher path and doesn't get this admin view).
 *
 * One real gap in the current backend surface shapes this page: there is
 * no "who is this society's current Supervisor/President" read endpoint,
 * so the assignment cards below can't pre-select or display who already
 * holds each role — only assign/revoke against the roster.
 *  - Only Developer Superadmin can create a member into an arbitrary
 *    society (POST .../developer-superadmin/societies/{id}/members).
 *    Onward Superadmin has no create-member endpoint at all — only
 *    assign/revoke Supervisor and President — so that form only renders
 *    for a Developer Superadmin viewer.
 *
 * Supervisor/President assignment picks a member by name from this
 * society's own roster (GET /api/v1/societies/{id}/members) — never a
 * raw User ID — matching the picker already used in (app)/members.
 */
export default function SocietyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: societyId } = usePromise(params);
  const canCreateMembers = readSessionInfo()?.role === "developer_superadmin";

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
      <p role="alert" className="text-sm font-semibold text-status-bad">
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

      <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-5 text-sm text-brand-ink/70">
        Assign this society&apos;s Supervisor, President and Admin from{" "}
        <Link href="/assign-roles" className="font-medium text-brand-gold-dark hover:underline">
          Assign Roles
        </Link>{" "}
        in the sidebar.
      </div>
    </div>
  );
}

function CreateMemberCard({ societyId }: { societyId: string }) {
  const [name, setName] = useState("");
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
      const response = await createMemberAsDeveloperSuperadmin(societyId, name, email, phoneNumber);
      if (!response.success || !response.data) {
        setError(response.message || "The member could not be created.");
        return;
      }
      setCreated(response.data);
      setName("");
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
        <span className="font-medium">/login</span> — they just enter their email or phone
        number there and the temporary-credential prompt comes up automatically.
      </p>

      {created && (
        <div className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm">
          <p className="font-semibold text-brand-ink">Member created: {created.name}.</p>
          <p className="mt-1 text-brand-ink/70">
            Temporary credential (share this with the member — it expires{" "}
            {new Date(created.temporaryCredentialExpiresAtUtc).toLocaleString()}):
          </p>
          <p className="mt-1 select-all break-all rounded-lg bg-brand-cream px-3 py-2 font-mono text-xs text-brand-ink">
            {created.temporaryCredential}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            id={`member-name-${societyId}`}
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
        </div>
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
        <p role="alert" className="mt-2 text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}
    </section>
  );
}
