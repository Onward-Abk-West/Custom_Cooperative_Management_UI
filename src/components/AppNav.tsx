"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isSuperadmin,
  navItemsForRole,
  type Role,
} from "@/lib/roles";
import type { Society } from "@/lib/mock-session";

/**
 * Role-aware nav + society context switcher for the authenticated app
 * shell. Both are UI-only for now: the switcher's selection lives in
 * local state rather than a real session/cookie, since there's no
 * backend to persist it to yet (see src/lib/mock-session.ts). Wiring
 * it up for real is a matter of replacing the `useState` here with
 * whatever reads/writes the session once auth exists — the shape
 * (role -> visible items, society list -> current society) shouldn't
 * need to change.
 */
export function AppNav({
  role,
  societies,
  currentSocietyId,
}: {
  role: Role;
  societies: Society[];
  currentSocietyId: string;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(role);
  const [societyId, setSocietyId] = useState(currentSocietyId);

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-5">
      {/* Horizontally scrollable rather than collapsed behind a
          hamburger — simpler for now, and every item stays reachable
          on a phone instead of hiding behind a menu that isn't built
          yet. Revisit once the item count grows past what scrolls
          comfortably. */}
      <nav
        aria-label="Primary"
        className="flex min-w-0 items-center gap-1 overflow-x-auto"
      >
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-brand-green text-brand-cream"
                  : "text-brand-ink/70 hover:bg-brand-line/40 hover:text-brand-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isSuperadmin(role) && societies.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="society-switcher" className="sr-only">
            Society
          </label>
          <select
            id="society-switcher"
            value={societyId}
            onChange={(e) => setSocietyId(e.target.value)}
            className="rounded-full border border-brand-line bg-white px-3 py-1.5 text-sm font-medium text-brand-ink outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
          >
            {societies.map((society) => (
              <option key={society.id} value={society.id}>
                {society.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
