"use client";

import { useState } from "react";
import { Sidebar, MenuIcon } from "@/components/Sidebar";
import type { Role } from "@/lib/roles";
import type { Society } from "@/lib/mock-session";

/**
 * Composes the sidebar with the rest of the authenticated shell.
 * `mobileOpen` has to live here rather than inside Sidebar itself:
 * the drawer's own close button is inside Sidebar, but the button
 * that *opens* it is the hamburger in this file's mobile header bar
 * — two components need the same boolean, so it's lifted to their
 * nearest shared parent instead of duplicated or reached for a
 * global store the way the collapse flag is (collapse only has one
 * reader/writer: Sidebar itself).
 *
 * (app)/layout.tsx stays a server component (it reads the session);
 * this client component is what actually needs the interactive
 * state, so the server layout just passes session data through as
 * props and renders this around `children`.
 */
export function AppShell({
  role,
  societies,
  currentSocietyId,
  userName,
  children,
}: {
  role: Role;
  societies: Society[];
  currentSocietyId: string;
  userName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-brand-cream">
      <Sidebar
        role={role}
        societies={societies}
        currentSocietyId={currentSocietyId}
        userName={userName}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-brand-line bg-surface-header px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-full p-2 text-brand-ink/70 transition hover:bg-brand-line/30"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="font-heading truncate text-sm font-bold text-brand-green">
            Onward Abeokuta-West
          </span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
