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
 *   - PIN-reset approval is a Supervisor+President responsibility, not
 *     Admin — see src/app/forgot-pin/page.tsx.
 *
 * There is no real auth/session yet (see src/lib/mock-session.ts), so
 * this file is the shape the app shell renders against, not live data.
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
    roles: ["admin", "supervisor", "president"],
  },
  {
    label: "Financial Records",
    href: "/financial-records",
    roles: ["admin", "supervisor", "president"],
  },
  {
    label: "PIN Reset Requests",
    href: "/pin-resets",
    roles: ["supervisor", "president"],
  },
  {
    label: "Societies",
    href: "/societies",
    roles: ["onward_superadmin", "developer_superadmin"],
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    roles: ["onward_superadmin", "developer_superadmin"],
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles === "all" || item.roles.includes(role)
  );
}
