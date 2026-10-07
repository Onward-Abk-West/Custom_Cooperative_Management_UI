"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { listSocietyMembers, type SocietyMemberSummary } from "@/lib/api/society-members";
import {
  assignSupervisor,
  assignPresident,
  revokeSupervisor,
  revokePresident,
  isConfirmationRequired,
  type SocietyRoleScope,
  type PresidentRoleScope,
} from "@/lib/api/society-assignments";
import {
  assignSocietyAdmin,
  revokeSocietyAdmin,
  type SocietyAdminScope,
} from "@/lib/api/society-admins";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";
import { isSuperadmin, type Role } from "@/lib/roles";

const MAX_PAGE_SIZE = 100;

type RoleKind = "Supervisor" | "President";
type AssignableRole = RoleKind | "Admin";

interface ConfirmState {
  userId: string;
  roleKind: RoleKind;
  reason: string;
  label: string;
}

interface Warning {
  id: string;
  text: string;
}

function memberLabel(member: SocietyMemberSummary): string {
  return member.name || member.email || member.phoneNumber || "Member";
}

function supervisorScopeFor(role: Role): SocietyRoleScope {
  return role === "developer_superadmin" ? "developer-superadmin" : "onward-superadmin";
}

function presidentScopeFor(role: Role): PresidentRoleScope {
  if (role === "supervisor") return "supervisor";
  return role === "developer_superadmin" ? "developer-superadmin" : "onward-superadmin";
}

function adminScopeFor(role: Role): SocietyAdminScope {
  if (role === "supervisor") return "supervisor";
  return role === "developer_superadmin" ? "developer-superadmin" : "onward-superadmin";
}

/**
 * "Assign Roles" (see src/lib/roles.ts's NAV_ITEMS) — the single home for
 * every per-society role assignment: Supervisor, President
 * (society-assignments.ts, one each, mutually exclusive, with the
 * backend's confirm-replace flow) and Admin (society-admins.ts,
 * many-per-society). Consolidates what used to be split three ways —
 * members/[id]'s AdminRoleCard, members' SupervisorPresidentCard, and
 * societies/[id]'s RoleAssignmentCard pair — into one roster table per
 * the PRD's one-Supervisor/one-President/many-Admin rule.
 *
 * Also enforces a rule the backend does NOT enforce as a single
 * transaction across these three endpoints: Supervisor, President and
 * Admin are mutually exclusive per person. Assigning Supervisor or
 * President to someone who currently holds Admin here fires a second
 * request — right after the first succeeds — to revoke their Admin
 * role, and a warning banner says so; it is never a silent side effect.
 * The reverse direction (assigning Admin to a current Supervisor or
 * President) is blocked client-side by simply not rendering that button
 * for them.
 *
 * A Supervisor viewing this page can act on President and Admin for
 * their own society, but never on Supervisor itself — the backend has
 * no route for a Supervisor to change their own role (see
 * society-assignments.ts's supervisorPath, scoped to SocietyRoleScope
 * only), so that column renders read-only for them.
 */
export default function AssignRolesPage() {
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-ink">Assign Roles</h1>
        <p className="mt-1 text-sm text-brand-ink/60">
          One Supervisor, one President and many Admins per society. Supervisor, President and
          Admin can never be held together — assigning Supervisor or President to someone who is
          currently an Admin automatically revokes their Admin role.
        </p>
      </div>

      {!societyId ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          {isSuperadmin(role)
            ? "Choose a society from the sidebar switcher to assign its roles."
            : "Your society could not be determined from your session — try signing in again."}
        </div>
      ) : (
        <AssignRolesTable societyId={societyId} role={role} />
      )}
    </div>
  );
}

function AssignRolesTable({ societyId, role }: { societyId: string; role: Role }) {
  const [roster, setRoster] = useState<SocietyMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, AssignableRole | "">>({});

  useEffect(() => {
    setConfirmState(null);
    setError(null);
    setNotice(null);
  }, [societyId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSocietyMembers(societyId, 1, MAX_PAGE_SIZE)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setError(response.message || "Members could not be loaded.");
          return;
        }
        setRoster(response.data.items);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message || "Members could not be loaded." : "Could not reach the server."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId]);

  async function refreshRoster() {
    const response = await listSocietyMembers(societyId, 1, MAX_PAGE_SIZE);
    if (response.success && response.data) {
      setRoster(response.data.items);
    }
  }

  function pushWarning(text: string) {
    setWarnings((current) => [...current, { id: `${Date.now()}-${Math.random()}`, text }]);
  }

  function dismissWarning(id: string) {
    setWarnings((current) => current.filter((w) => w.id !== id));
  }

  async function autoRevokeAdminFor(member: SocietyMemberSummary) {
    try {
      const response = await revokeSocietyAdmin(adminScopeFor(role), societyId, member.userId);
      if (response.success) {
        pushWarning(
          `${memberLabel(member)}'s Admin role was automatically revoked — Supervisor/President and Admin cannot be held together.`
        );
      } else {
        pushWarning(
          `${memberLabel(member)} still shows as Admin — their Admin role could not be automatically revoked (${
            response.message || "unknown error"
          }). Please revoke it manually below.`
        );
      }
    } catch {
      pushWarning(
        `${memberLabel(member)} still shows as Admin — their Admin role could not be automatically revoked. Please revoke it manually below.`
      );
    }
  }

  async function handleAssign(member: SocietyMemberSummary, roleKind: RoleKind, confirm: boolean) {
    const key = `${member.userId}:${roleKind}`;
    setActingKey(key);
    setError(null);
    try {
      const response =
        roleKind === "Supervisor"
          ? await assignSupervisor(supervisorScopeFor(role), societyId, member.userId, confirm)
          : await assignPresident(presidentScopeFor(role), societyId, member.userId, confirm);
      if (!response.success) {
        setError(response.message || `${roleKind} could not be assigned.`);
        return;
      }
      if (isConfirmationRequired(response.data)) {
        setConfirmState({ userId: member.userId, roleKind, reason: response.data.reason, label: memberLabel(member) });
        return;
      }
      setConfirmState(null);
      setNotice(response.message || `${roleKind} assigned to ${memberLabel(member)}.`);
      if (member.roles.includes("Admin")) {
        await autoRevokeAdminFor(member);
      }
      await refreshRoster();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || `${roleKind} could not be assigned.` : "Could not reach the server."
      );
    } finally {
      setActingKey(null);
    }
  }

  async function handleRevokeRole(roleKind: RoleKind) {
    const key = `revoke:${roleKind}`;
    setActingKey(key);
    setError(null);
    try {
      const response =
        roleKind === "Supervisor"
          ? await revokeSupervisor(supervisorScopeFor(role), societyId)
          : await revokePresident(presidentScopeFor(role), societyId);
      if (!response.success) {
        setError(response.message || `${roleKind} could not be revoked.`);
        return;
      }
      setNotice(response.message || `${roleKind} revoked.`);
      await refreshRoster();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || `${roleKind} could not be revoked.` : "Could not reach the server."
      );
    } finally {
      setActingKey(null);
    }
  }

  /** Roles this member doesn't already hold, filtered to what the
   * viewer may assign: Supervisor only ever appears for a superadmin
   * (the backend has no route for a Supervisor to assign their own
   * role), and Admin is left off entirely for a current Supervisor or
   * President — those three can never be held together — rather than
   * offered and then silently kicked back by the server. */
  function assignableRolesFor(member: SocietyMemberSummary): AssignableRole[] {
    const hasSupervisor = member.roles.includes("Supervisor");
    const hasPresident = member.roles.includes("President");
    const hasAdmin = member.roles.includes("Admin");
    const options: AssignableRole[] = [];
    if (!hasSupervisor && isSuperadmin(role)) options.push("Supervisor");
    if (!hasPresident) options.push("President");
    if (!hasAdmin && !hasSupervisor && !hasPresident) options.push("Admin");
    return options;
  }

  function currentGovernanceRole(member: SocietyMemberSummary): AssignableRole | null {
    if (member.roles.includes("Supervisor")) return "Supervisor";
    if (member.roles.includes("President")) return "President";
    if (member.roles.includes("Admin")) return "Admin";
    return null;
  }

  async function handleAssignSelected(member: SocietyMemberSummary) {
    const value = selected[member.userId];
    if (!value) return;
    if (value === "Admin") {
      await handleToggleAdmin(member);
    } else {
      await handleAssign(member, value, false);
    }
    setSelected((current) => ({ ...current, [member.userId]: "" }));
  }

  async function handleToggleAdmin(member: SocietyMemberSummary) {
    const key = `${member.userId}:Admin`;
    setActingKey(key);
    setError(null);
    const isAdmin = member.roles.includes("Admin");
    try {
      const response = isAdmin
        ? await revokeSocietyAdmin(adminScopeFor(role), societyId, member.userId)
        : await assignSocietyAdmin(adminScopeFor(role), societyId, member.userId);
      if (!response.success) {
        setError(response.message || "The Admin role could not be changed.");
        return;
      }
      setNotice(
        response.message ||
          (isAdmin ? `Admin revoked from ${memberLabel(member)}.` : `${memberLabel(member)} made Admin.`)
      );
      await refreshRoster();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || "The Admin role could not be changed." : "Could not reach the server."
      );
    } finally {
      setActingKey(null);
    }
  }

  const confirmMember = confirmState ? roster.find((m) => m.userId === confirmState.userId) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      {warnings.map((warning) => (
        <div
          key={warning.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p>{warning.text}</p>
          <button
            type="button"
            onClick={() => dismissWarning(warning.id)}
            className="shrink-0 text-xs font-semibold text-amber-900/70 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ))}

      {confirmState && confirmMember && (
        <div className="rounded-xl border border-amber-400/50 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            Confirm replacing {confirmState.roleKind} ({confirmState.reason})
          </p>
          <p className="mt-1">
            This will replace whoever currently holds {confirmState.roleKind} with{" "}
            {confirmState.label}.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              disabled={!!actingKey}
              onClick={() => handleAssign(confirmMember, confirmState.roleKind, true)}
            >
              {actingKey ? "Confirming…" : "Confirm replacement"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmState(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {notice && <p className="text-sm text-brand-green">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading members…
        </div>
      ) : roster.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No members yet in this society.
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Member</TableHeaderCell>
              <TableHeaderCell>Roles</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roster.map((member) => {
              const currentRole = currentGovernanceRole(member);
              const options = assignableRolesFor(member);
              const selectedValue = selected[member.userId] ?? "";
              const canRevokeCurrent =
                currentRole !== null && (currentRole !== "Supervisor" || isSuperadmin(role));
              const revokeKey =
                currentRole === "Admin" ? `${member.userId}:Admin` : `revoke:${currentRole}`;
              const assignKey =
                selectedValue === "Admin" ? `${member.userId}:Admin` : `${member.userId}:${selectedValue}`;

              return (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{memberLabel(member)}</span>
                      <span className="text-xs text-brand-ink/50">
                        {member.email || member.phoneNumber || ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{member.roles.join(", ") || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {currentRole && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-brand-line/25 px-3 py-1 text-xs font-semibold text-brand-ink">
                          {currentRole}
                          {canRevokeCurrent && (
                            <button
                              type="button"
                              disabled={!!actingKey}
                              onClick={() =>
                                currentRole === "Admin" ? handleToggleAdmin(member) : handleRevokeRole(currentRole)
                              }
                              className="font-semibold text-status-bad hover:underline disabled:opacity-50"
                            >
                              {actingKey === revokeKey ? "…" : "Revoke"}
                            </button>
                          )}
                        </span>
                      )}
                      {options.length > 0 && (
                        <div className="flex items-center gap-2">
                          <label htmlFor={`assign-${member.userId}`} className="sr-only">
                            Assign a role to {memberLabel(member)}
                          </label>
                          <select
                            id={`assign-${member.userId}`}
                            value={selectedValue}
                            onChange={(e) =>
                              setSelected((current) => ({
                                ...current,
                                [member.userId]: e.target.value as AssignableRole,
                              }))
                            }
                            disabled={!!actingKey}
                            className="rounded-full border border-brand-line bg-brand-line/25 px-3 py-1.5 text-xs text-brand-ink outline-none focus:border-brand-gold focus:bg-brand-cream focus:ring-2 focus:ring-brand-gold/30"
                          >
                            <option value="">Assign role…</option>
                            {options.map((optionRole) => (
                              <option key={optionRole} value={optionRole}>
                                {optionRole}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            disabled={!!actingKey || !selectedValue}
                            onClick={() => handleAssignSelected(member)}
                          >
                            {actingKey === assignKey ? "…" : "Assign"}
                          </Button>
                        </div>
                      )}
                      {!currentRole && options.length === 0 && (
                        <span className="text-xs text-brand-ink/40">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
