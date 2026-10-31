import type { SVGProps } from "react";

/**
 * One thin-stroke icon per sidebar nav item (src/lib/roles.ts's
 * NAV_ITEMS), keyed by href so Sidebar.tsx can look one up without
 * roles.ts — a plain data/role model — needing to import JSX. Every
 * icon shares the same 24x24 viewBox and stroke weight so they sit
 * flush in both the expanded and icon-only (collapsed) rail.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.5" />
      <rect x="13" y="10.5" width="7.5" height="10" rx="1.5" />
      <rect x="3.5" y="13.5" width="7.5" height="7" rx="1.5" />
    </Icon>
  );
}

function RecordsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V5A1.5 1.5 0 0 1 6 3.5Z" />
      <path d="M14 3.5V8h4" />
      <path d="M8 12.5h8M8 16h5" />
    </Icon>
  );
}

function MembersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M15.5 14.2c2.4.4 4 2 4 4.8" />
    </Icon>
  );
}

function LedgerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9v0M17.5 15v0" />
    </Icon>
  );
}

function PinResetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="15" r="3.5" />
      <path d="M10.8 12.2 18 5m0 0h-3.2M18 5v3.2" />
    </Icon>
  );
}

function SocietiesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20V9l5-3.5V20M4 20h16M9 20V9l5 3v8M14 12l5-2.5V20" />
    </Icon>
  );
}

function AssignRolesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 5 6.5v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9v-5L12 3.5Z" />
      <path d="M9 12l2 2 4-4.5" />
    </Icon>
  );
}

function ImportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5v11M8 10.5l4 4 4-4" />
      <path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" />
    </Icon>
  );
}

function AuditIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="M8.5 11.5h7M8.5 15h7M8.5 18h4.5" />
    </Icon>
  );
}

function SettingsNavIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </Icon>
  );
}

function DefaultIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
    </Icon>
  );
}

function ScheduleIcon(props: IconProps) {
  return <Icon {...props}><rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h3M8 17h6"/></Icon>;
}

function ImportListIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 3.5v10M8.5 10l3.5 3.5 3.5-3.5M5 16v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-3"/></Icon>;
}

function LoansIcon(props: IconProps) {
  return <Icon {...props}><path d="M6 3.5h8l4 4V20H6a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/><path d="M14 3.5V8h4M8 12h7M8 16h4"/><circle cx="17.5" cy="17.5" r="3"/><path d="M17.5 16v3M16.5 16.7h1.5a.8.8 0 1 1 0 1.6h-1.5"/></Icon>;
}

function RequestsIcon(props: IconProps) {
  return <Icon {...props}><path d="M6 4h12a2 2 0 0 1 2 2v14l-3.5-2-3.5 2-3.5-2L6 20V4Z"/><path d="M9 9h6M9 13h6"/></Icon>;
}

export const NAV_ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  "/dashboard": DashboardIcon,
  "/records": RecordsIcon,
  "/members": MembersIcon,
  "/financial-records": LedgerIcon,
  "/pin-resets": PinResetIcon,
  "/profile-requests": RequestsIcon,
  "/societies": SocietiesIcon,
  "/assign-roles": AssignRolesIcon,
  "/import": ImportIcon,
  "/monthly-import": ImportListIcon,
  "/monthly-import/schedule": ScheduleIcon,
  "/loans": LoansIcon,
  "/audit-log": AuditIcon,
  "/settings": SettingsNavIcon,
};

export function navIconFor(href: string) {
  return NAV_ICONS[href] ?? DefaultIcon;
}
