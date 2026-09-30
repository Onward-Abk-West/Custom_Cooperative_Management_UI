"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import {
  createMemberAsSupervisor,
  createMemberAsDeveloperSuperadmin,
  type CreatedMemberData,
} from "@/lib/api/members";
import { listSocietyMembers, type SocietyMemberSummary } from "@/lib/api/society-members";
import {
  assignPresident,
  revokePresident,
  isConfirmationRequired,
} from "@/lib/api/society-assignments";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";
import { isSuperadmin, type Role } from "@/lib/roles";

const PAGE_SIZE = 20;

/**
 * "Members" (see src/lib/roles.ts's NAV_ITEMS) — a real roster, now that
 * GET /api/v1/societies/{societyId}/members exists
 * (AbkWestCoop.Api.Controllers.SocietyMembersController). For
 * Developer/Onward Superadmin the roster follows the sidebar's society
 * switcher (see src/lib/society-context.tsx and Sidebar.tsx); every
 * other role that reaches this page (Admin, Supervisor, President) only
 * ever belongs to one society — their own, from the session — so no
 * switcher renders for them and this page reads that instead.
 *
 * Supervisor additionally gets its two write actions with no other home
 * in the nav: creating a member directly into their own society, and
 * assigning/revoking their society's President. Developer Superadmin
 * can create a member into whichever society the switcher currently
 * points at. Onward Superadmin, Admin and President see the roster
 * read-only — neither has a create-member endpoint on the backend.
 */
export default function MembersPage() {
  const router = useRouter();
  const { societyId: switchedSocietyId } = useSociety();
  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState<string>("");

  useEffect(() => {
    const info = readSessionInfo();
    setRole(info?.role ?? null);
    setOwnSocietyId(info?.societyId ?? "");
  }, []);

  if (!role) {
    return <p className="text-sm text-brand-ink/60">Loading…</p>;
  }

  const societyId = isSuperadmin(role) ? switchedSocietyId : ownSocietyId;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-ink">Members</h1>
          <p className="mt-1 text-sm text-brand-ink/60">
            Everyone in this society — Members, Admins, Supervisor and President alike.
          </p>
        </div>
        <MemberLookupForm onLookup={(id) => router.push(`/members/${id}`)} />
      </div>

      {!societyId ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          {isSuperadmin(role)
            ? "Choose a society from the sidebar switcher to see its members."
            : "Your society could not be determined from your session — try signing in again."}
        </div>
      ) : (
        <MembersRoster societyId={societyId} />
      )}

      {role === "supervisor" && (
        <>
          <SupervisorCreateMemberCard />
          <SupervisorPresidentCard />
        </>
      )}

      {role === "developer_superadmin" && societyId && (
        <DeveloperCreateMemberCard societyId={societyId} />
      )}
    </div>
  );
}

function MemberLookupForm({ onLookup }: { onLookup: (id: string) => void }) {
  const [memberId, setMemberId] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (memberId.trim()) onLookup(memberId.trim());
      }}
      noValidate
      className="flex items-end gap-2"
    >
      <div className="w-64">
        <Input
          id="member-lookup-id"
          label="Jump to a User ID"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
        />
      </div>
      <Button type="submit" variant="outline">
        Go
      </Button>
    </form>
  );
}

function MembersRoster({ societyId }: { societyId: string }) {
  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<SocietyMemberSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Jumping to a different society (via the sidebar switcher) always
  // restarts at page 1 — a stale page number from the previous society
  // would otherwise request an out-of-range page on the new one.
  useEffect(() => {
    setPageNumber(1);
  }, [societyId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSocietyMembers(societyId, pageNumber, PAGE_SIZE)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setError(response.message || "Members could not be loaded.");
          return;
        }
        setItems(response.data.items);
        setTotalPages(response.data.totalPages);
        setTotalCount(response.data.totalCount);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message || "Members could not be loaded."
            : "Could not reach the server. Please check your connection and try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId, pageNumber]);

  return (
    <div className="flex flex-col gap-4">
      {totalCount > 0 && (
        <p className="text-sm text-brand-ink/60">
          {totalCount} member{totalCount === 1 ? "" : "s"}.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading members…
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No members yet in this society.
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Phone</TableHeaderCell>
              <TableHeaderCell>Roles</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((member) => (
              <TableRow key={member.userId}>
                <TableCell>{member.email || "—"}</TableCell>
                <TableCell>{member.phoneNumber || "—"}</TableCell>
                <TableCell>{member.roles.join(", ") || "—"}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/members/${member.userId}`}
                    className="text-sm font-medium text-brand-gold-dark hover:underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-brand-ink/60">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
            className="rounded-full border border-brand-line px-3 py-1.5 font-medium transition hover:bg-brand-line/25 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {pageNumber} of {totalPages}
          </span>
          <button
            type="button"
            disabled={pageNumber >= totalPages}
            onClick={() => setPageNumber((n) => Math.min(totalPages, n + 1))}
            className="rounded-full border border-brand-line px-3 py-1.5 font-medium transition hover:bg-brand-line/25 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function DeveloperCreateMemberCard({ societyId }: { societyId: string }) {
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
    <section className="max-w-lg rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-brand-ink">
        Create member in the selected society
      </h2>
      <p className="mt-1 text-sm text-brand-ink/60">
        Creates into whichever society the sidebar switcher currently points at. Issues a
        temporary credential the new member exchanges for their own PIN at{" "}
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
          <Input id="dev-member-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@example.com" />
        </div>
        <div className="flex-1">
          <Input id="dev-member-phone" label="Phone number" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+234…" />
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
