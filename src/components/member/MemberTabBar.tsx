"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearIcon, HomeIcon, UserIcon } from "./MemberIcons";

/**
 * Floating bottom tab bar for members on phones (hidden from the md
 * breakpoint up, where the sidebar takes over). One tab per member
 * page that exists in the app: the dashboard, the member's own
 * profile, and settings.
 */
const TABS = [
  { label: "Home", href: "/dashboard", Icon: HomeIcon, match: ["/dashboard"] },
  { label: "Profile", href: "/records", Icon: UserIcon, match: ["/records"] },
  { label: "Settings", href: "/settings", Icon: GearIcon, match: ["/settings"] },
] as const;

export function MemberTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-3xl border border-brand-line bg-brand-cream/95 p-1.5 shadow-xl backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-3 gap-1">
        {TABS.map(({ label, href, Icon, match }) => {
          const active = match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "bg-brand-green/15 text-brand-green"
                    : "text-brand-ink/60 hover:text-brand-ink"
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
