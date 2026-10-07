/**
 * Role and navigation model, per the locked PRD (Revision 3):
 *
 *   - Developer superadmin: full in-app control, no Member entity of
 *     its own, own audit trail visible only to itself.
 *   - Onward superadmin: the business owner — assigns Supervisors,
 *     views audit logs. Cannot create a society: per the PRD decision,
 *     society creation stays Developer-Superadmin-only even though
 *     society count is dynamic (DeveloperSuperadminSocietiesController's
 *     [Authorize] on the backend enforces this — an earlier version of
 *     this comment said Onward Superadmin could create societies; it
 *     couldn't, on the backend, and that was the bug, not this line).
 *   - Per society: one Supervisor, one President (mutually exclusive —
 *     a person holds one or the other, not both), at least four
 *     Admins, and many Members. Society data is isolated: only a
 *     superadmin can see across societies.
 *   - PIN-reset approval is a Supervisor/President/superadmin
 *     responsibility (any one of them, not a joint approval) — not
 *     Admin. A Member requests one from My Records while signed in;
 *     see src/lib/api/pin-reset.ts. Redemption now happens through the
 *     unified src/app/login/page.tsx (which calls
 *     src/lib/api/account-identify.ts first) rather than a dedicated
 *     /forgot-pin page — that route still exists but just redirects here.
 *   - Profile-change review is an Admin responsibility — a Member has
 *     no self-service profile edit, only a request an Admin approves
 *     or rejects. See src/lib/api/profile-update-requests.ts.
 *
 * getMockSession() (src/lib/mock-session.ts) is now only a fallback for
 * a session cookie without session-info — see (app)/layout.tsx — not
 * the everyday path, now that real login/session.ts exist.
 */
export type Role =
  | "developer_superadmin"
  | "onward_superadmin"
  | "supervisor"
  | "president"
  | "admin"
  | "member";

export const ROLE_LABELS: Record<Role, string> = {
  developer_superadmin: "Developer Superadmin",
  onward_superadmin: "Onward Superadmin",
  supervisor: "Supervisor",
  president: "President",
  admin: "Admin",
  member: "Member",
};

export function isSuperadmin(role: Role): boolean {
  return role === "developer_superadmin" || role === "onward_superadmin";
}

export interface NavItem {
  label: string;
  href: string;
  /** "all" renders for every role; otherwise an explicit allow-list. */
  roles: Role[] | "all";
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: "all" },
  { label: "My Records", href: "/records", roles: ["member"] },
  {
    label: "Members",
    href: "/members",
    // GET /api/v1/members/{id}'s full reader list, per MemberProfilesController.
    roles: ["admin", "supervisor", "president", "developer_superadmin", "onward_superadmin"],
  },
  {
    label: "Financial Records",
    href: "/financial-records",
    // POST-only create endpoint now exists (FinancialTransactionsControllers)
    // for exactly these two roles — Admin (own society, implicit) and
    // Developer Superadmin (any society, via the sidebar switcher).
    // Supervisor, President and Onward Superadmin have no create
    // endpoint and no list/read endpoint exists for anyone yet, so this
    // nav item — and (app)/financial-records/page.tsx — stays limited
    // to a create form for just these two roles.
    roles: ["admin", "developer_superadmin"],
  },
  {
    label: "PIN Reset Requests",
    href: "/pin-resets",
    // Matches PinResetRequestsController's [Authorize(Roles = ...)] exactly.
    roles: ["supervisor", "president", "developer_superadmin", "onward_superadmin"],
  },
  {
    label: "Profile Update Requests",
    href: "/profile-requests",
    // AdminProfileUpdateRequestsController — Admin only.
    roles: ["admin"],
  },
  {
    label: "Assign Roles",
    href: "/assign-roles",
    // The one place Supervisor, President and Admin get assigned —
    // Supervisor (own society, President + Admin only — the backend
    // has no route for a Supervisor to change their own role) and
    // Developer/Onward Superadmin (any society, all three). See
    // (app)/assign-roles/page.tsx, which also enforces that Supervisor,
    // President and Admin can never be held by the same person at once.
    roles: ["supervisor", "developer_superadmin", "onward_superadmin"],
  },
  // No standalone "Societies" nav item — the sidebar's society switcher
  // (Sidebar.tsx, superadmin roles only) now owns switching societies,
  // with "Manage" (→ /societies/[id], the Supervisor/President
  // assignment forms) and "New society" (Developer Superadmin only)
  // links right beside it. /societies/new and /societies/[id] still
  // exist — just reached from the switcher instead of a nav item; the
  // old list-all-societies table (/societies) isn't linked from
  // anywhere in the UI anymore.
  {
    label: "DGT Import",
    href: "/dgt-import",
    // DeveloperSuperadminDgtImportsController's [Authorize(Roles =
    // "Developer Superadmin")] is exact — not Onward Superadmin too,
    // unlike most other developer_superadmin/onward_superadmin pairs in
    // this list. One-time-per-society legacy-data migration tool: see
    // (app)/dgt-import/page.tsx.
    roles: ["developer_superadmin"],
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    // Developer Superadmin sees its own private trail
    // (DeveloperSuperadminAuditLogsController); Onward Superadmin sees a
    // separate, filterable, umbrella-wide log
    // (OnwardSuperadminAuditLogsController) that deliberately excludes
    // the Developer Superadmin's private events — see (app)/audit-log/
    // page.tsx, which picks the endpoint per session.role.
    roles: ["developer_superadmin", "onward_superadmin"],
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles === "all" || item.roles.includes(role)
  );
}
