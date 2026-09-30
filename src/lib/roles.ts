/**
 * Role and navigation model, per the locked PRD (Revision 3):
 *
 *   - Developer superadmin: full in-app control, no Member entity of
 *     its own, own audit trail visible only to itself.
 *   - Onward superadmin: the business owner — creates societies,
 *     assigns Supervisors, views (shared) audit logs.
 *   - Per society: one Supervisor, one President (mutually exclusive —
 *     a person holds one or the other, not both), at least four
 *     Admins, and many Members. Society data is isolated: only a
 *     superadmin can see across societies.
 *   - PIN-reset approval is a Supervisor/President/superadmin
 *     responsibility (any one of them, not a joint approval) — not
 *     Admin. A Member requests one from My Records while signed in;
 *     see src/lib/api/pin-reset.ts and src/app/forgot-pin/page.tsx.
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
    // No backend endpoint exists for this yet — nav placeholder only.
    roles: ["admin", "supervisor", "president"],
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
    label: "Societies",
    href: "/societies",
    roles: ["onward_superadmin", "developer_superadmin"],
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    // DeveloperSuperadminAuditLogsController — Developer Superadmin
    // only, NOT Onward Superadmin, despite the name suggesting a
    // shared umbrella-wide log.
    roles: ["developer_superadmin"],
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles === "all" || item.roles.includes(role)
  );
}
