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

function AuditIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="M8.5 11.5h7M8.5 15h7M8.5 18h4.5" />
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

export const NAV_ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  "/dashboard": DashboardIcon,
  "/records": RecordsIcon,
  "/members": MembersIcon,
  "/financial-records": LedgerIcon,
  "/pin-resets": PinResetIcon,
  "/societies": SocietiesIcon,
  "/audit-log": AuditIcon,
};

export function navIconFor(href: string) {
  return NAV_ICONS[href] ?? DefaultIcon;
}
