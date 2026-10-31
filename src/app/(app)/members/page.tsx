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
import { Avatar } from "@/components/member/Avatar";
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
import { Pagination } from "@/components/ui/Pagination";
import { usePageSize } from "@/lib/use-page-size";
import { showError, showSuccess } from "@/lib/feedback";

const DEFAULT_PAGE_SIZE = 25;

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

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
        <div className="flex flex-wrap items-end gap-3">
          <MemberFilterBox value={filterText} onChange={setFilterText} />
          {(role === "supervisor" || role === "developer_superadmin") && societyId && <Button type="button" onClick={() => setCreateOpen(true)}>+ Create Member</Button>}
        </div>
      </div>

      {!societyId ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          {isSuperadmin(role)
            ? "Choose a society from the sidebar switcher to see its members."
            : "Your society could not be determined from your session — try signing in again."}
        </div>
      ) : (
        <MembersRoster societyId={societyId} filterText={filterText} refreshKey={refreshKey} />
      )}

      {createOpen && <MemberCreationDialog title="Create member" onClose={() => setCreateOpen(false)}>
        {role === "supervisor"
          ? <SupervisorCreateMemberCard onCreated={() => setRefreshKey((key) => key + 1)} onClose={() => setCreateOpen(false)} />
          : role === "developer_superadmin" && societyId
            ? <DeveloperCreateMemberCard societyId={societyId} onCreated={() => setRefreshKey((key) => key + 1)} onClose={() => setCreateOpen(false)} />
            : null}
      </MemberCreationDialog>}
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

function MembersRoster({
  societyId,
  filterText,
  refreshKey,
}: {
  societyId: string;
  filterText: string;
  refreshKey: number;
}) {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = usePageSize(DEFAULT_PAGE_SIZE);
  const [items, setItems] = useState<SocietyMemberSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = filterText.trim();

  // Jumping to a different society (via the sidebar switcher) always
  // restarts at page 1 — a stale page number from the previous society
  // would otherwise request an out-of-range page on the new one.
  useEffect(() => {
    setPageNumber(1);
  }, [societyId, search, pageSize]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSocietyMembers(societyId, pageNumber, pageSize, search)
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
  }, [societyId, pageNumber, pageSize, search, refreshKey]);

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading members…
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          {search ? "No members match that search." : "No members yet in this society."}
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
            {items.map((member) => (
              <TableRow key={member.userId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar pictureUrl={member.profilePictureUrl} name={member.name} email={member.email} size="sm" />
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

      <Pagination pageNumber={pageNumber} pageSize={pageSize} totalCount={totalCount} totalPages={totalPages} onPageChange={setPageNumber} onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }} />
    </div>
  );
}

function MemberCreationDialog({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="member-create-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface-card p-5 shadow-2xl sm:p-7">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="member-create-title" className="font-heading text-xl font-bold text-heading">{title}</h2><p className="mt-1 text-sm text-brand-ink/60">Add a member to the selected society.</p></div><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-full px-2 py-1 text-xl text-brand-ink/60 hover:bg-brand-line/30">×</button></div>
      {children}
    </section>
  </div>;
}

function DeveloperCreateMemberCard({ societyId, onCreated, onClose }: { societyId: string; onCreated: () => void; onClose: () => void }) {
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
        const message = response.message || "The member could not be created.";
        setError(message);
        await showError("Member not created", message);
        return;
      }
      setCreated(response.data);
      onCreated();
      await showSuccess("Member created", `Temporary credential (copy and share securely): ${response.data.temporaryCredential}`);
      onClose();
      setName("");
      setEmail("");
      setPhoneNumber("");
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "The member could not be created." : "Could not reach the server.";
      setError(message);
      await showError("Member not created", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
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

      <form onSubmit={handleSubmit} noValidate className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
        <div className="flex-1">
          <Input id="dev-member-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="flex-1">
          <Input id="dev-member-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@example.com" />
        </div>
        <div className="flex-1">
          <Input id="dev-member-phone" label="Phone number" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+234…" />
        </div>
        <Button type="submit" disabled={submitting || Boolean(created)}>
          {submitting ? "Creating…" : created ? "Created" : "Create"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}
    </div>
  );
}

function SupervisorCreateMemberCard({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
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
        const message = response.message || "The member could not be created.";
        setError(message);
        await showError("Member not created", message);
        return;
      }
      setCreated(response.data);
      onCreated();
      await showSuccess("Member created", `Temporary credential (copy and share securely): ${response.data.temporaryCredential}`);
      onClose();
      setName("");
      setEmail("");
      setPhoneNumber("");
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "The member could not be created." : "Could not reach the server.";
      setError(message);
      await showError("Member not created", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
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
      <form onSubmit={handleSubmit} noValidate className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
        <div className="flex-1">
          <Input id="supervisor-member-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="flex-1">
          <Input id="supervisor-member-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@example.com" />
        </div>
        <div className="flex-1">
          <Input id="supervisor-member-phone" label="Phone number" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+234…" />
        </div>
        <Button type="submit" disabled={submitting || Boolean(created)}>
          {submitting ? "Creating…" : created ? "Created" : "Create"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}
    </div>
  );
}
