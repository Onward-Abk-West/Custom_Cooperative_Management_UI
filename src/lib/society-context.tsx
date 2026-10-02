"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

interface SocietyContextValue {
  societyId: string;
  /** The raw useState setter, not a narrowed `(id: string) => void` —
   * Sidebar's "seed the switcher from the fetched list" effect calls
   * this with a functional updater (`setSocietyId((current) => ...)`),
   * which only type-checks if this stays Dispatch<SetStateAction<...>>. */
  setSocietyId: Dispatch<SetStateAction<string>>;
}

const SocietyContext = createContext<SocietyContextValue | null>(null);

/**
 * The single source of truth for "which society is currently selected"
 * — written by Sidebar's society switcher, read by any page whose
 * content should follow that selection (Members, in particular).
 * Provided once in AppShell so both live under the same React tree.
 *
 * Only Developer/Onward Superadmin ever change this — every other role
 * belongs to exactly one society (their session's own societyId, which
 * never changes), so Sidebar seeds this with that value and never shows
 * a switcher for them; pages for those roles can read the context too
 * (it's always populated) but the value never moves under them.
 */
export function SocietyProvider({
  initialSocietyId,
  children,
}: {
  initialSocietyId: string;
  children: ReactNode;
}) {
  const [societyId, setSocietyId] = useState(initialSocietyId);
  return (
    <SocietyContext.Provider value={{ societyId, setSocietyId }}>
      {children}
    </SocietyContext.Provider>
  );
}

export function useSociety(): SocietyContextValue {
  const ctx = useContext(SocietyContext);
  if (!ctx) {
    throw new Error("useSociety must be used within a SocietyProvider (see AppShell).");
  }
  return ctx;
}
