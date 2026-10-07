"use client";

import { useEffect, useState } from "react";
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
  const { societyId: switchedSocietyId } = useSociety();
  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState<string>("");
  const [filterText, setFilterText] = useState("");

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
          <h1 className="font-heading text-2xl font-bold text-heading">Members</h1>
          <p className="mt-1 text-sm text-brand-ink/60">
            Everyone in this society — Members, Admins, Supervisor and President alike.
          </p>
        </div>
        <MemberFilterBox value={filterText} onChange={setFilterText} />
      </div>

      {!societyId ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          {isSuperadmin(role)
            ? "Choose a society from the sidebar switcher to see its members."
            : "Your society could not be determined from your session — try signing in again."}
        </div>
      ) : (
        <MembersRoster societyId={societyId} filterText={filterText} />
      )}

      {role === "supervisor" && <SupervisorCreateMemberCard />}

      {role === "developer_superadmin" && societyId && (
        <DeveloperCreateMemberCard societyId={societyId} />
      )}
    </div>
  );
}

/**
 * A live filter, not a lookup-by-ID box — matches by name, email or
 * phone number. Member IDs are never surfaced as something a person
 * types or reads here; see MembersRoster for how the match is applied.
 */
function MemberFilterBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="w-72">
      <Input
        id="member-filter"
        label="Filter members"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, email or phone"
      />
    </div>
  );
}

/** The largest page the backend allows in one request (see
 * ListSocietyMembersRequest/SocietyMembersController: pageSize must be
 * 1-100) — used while filtering so the match has as much of the
 * roster to search as a single request can hold. */
const MAX_PAGE_SIZE = 100;

function MembersRoster({
  societyId,
  filterText,
}: {
  societyId: string;
  filterText: string;
}) {
  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<SocietyMemberSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const needle = filterText.trim().toLowerCase();
  const isFiltering = needle.length > 0;
  // Filtering is client-side (the backend has no text-search query yet),
  // so it trades normal pagination for the single largest page available
  // and searches within that. Fine for a society-sized roster; see the
  // "showing matches from" note below for the honest caveat once a
  // society has grown past MAX_PAGE_SIZE members.
  const effectivePageNumber = isFiltering ? 1 : pageNumber;
  const effectivePageSize = isFiltering ? MAX_PAGE_SIZE : PAGE_SIZE;

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
    listSocietyMembers(societyId, effectivePageNumber, effectivePageSize)
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
  }, [societyId, effectivePageNumber, effectivePageSize]);

  const visibleItems = isFiltering
    ? items.filter(
        (member) =>
          member.name?.toLowerCase().includes(needle) ||
          member.email?.toLowerCase().includes(needle) ||
          member.phoneNumber?.toLowerCase().includes(needle)
      )
    : items;

  return (
    <div className="flex flex-col gap-4">
      {totalCount > 0 && (
        <p className="text-sm text-brand-ink/60">
          {isFiltering
            ? `${visibleItems.length} match${visibleItems.length === 1 ? "" : "es"}`
            : `${totalCount} member${totalCount === 1 ? "" : "s"}.`}
          {isFiltering && totalCount > MAX_PAGE_SIZE && (
            <> — searched the first {MAX_PAGE_SIZE} of {totalCount} members.</>
          )}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading members…
        </div>
      ) : visibleItems.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          {isFiltering ? "No members match that filter." : "No members yet in this society."}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Phone</TableHeaderCell>
              <TableHeaderCell>Roles</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleItems.map((member) => (
              <TableRow key={member.userId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {member.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.profilePictureUrl}
                        alt=""
                        className="h-7 w-7 rounded-full border border-brand-line object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-line bg-brand-line/25 text-xs font-semibold text-brand-ink/50">
                        {(member.name || member.email || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    {member.name || "—"}
                  </div>
                </TableCell>
                <TableCell>{member.email || "—"}</TableCell>
                <TableCell>{member.phoneNumber || "—"}</TableCell>
                <TableCell>{member.roles.join(", ") || "—"}</TableCell>
                <TableCell>{member.status}</TableCell>
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

      {!isFiltering && totalPages > 1 && (
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
    <section className="max-w-lg rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-heading">
        Create member in the selected society
      </h2>
      <p className="mt-1 text-sm text-brand-ink/60">
        Creates into whichever society the sidebar switcher currently points at. Issues a
        temporary credential the new member exchanges for their own PIN at{" "}
        <span className="font-medium">/login</span> — they just enter their email or phone
        number there and the temporary-credential prompt comes up automatically.
      </p>

      {created && (
        <div className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm">
          <p className="font-semibold text-brand-ink">
            Member created: {created.name}.
          </p>
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
          <Input id="dev-member-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </div>
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
        <p role="alert" className="mt-2 text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}
    </section>
  );
}

function SupervisorCreateMemberCard() {
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
      const response = await createMemberAsSupervisor(name, email, phoneNumber);
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
    <section className="max-w-lg rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-heading">Create member in your society</h2>
      {created && (
        <div className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm">
          <p className="font-semibold text-brand-ink">
            Member created: {created.name}.
          </p>
          <p className="mt-1 text-brand-ink/70">
            Temporary credential (expires {new Date(created.temporaryCredentialExpiresAtUtc).toLocaleString()}):
          </p>
          <p className="mt-1 select-all break-all rounded-lg bg-brand-cream px-3 py-2 font-mono text-xs text-brand-ink">
            {created.temporaryCredential}
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input id="supervisor-member-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </div>
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
        <p role="alert" className="mt-2 text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}
    </section>
  );
}
