import type { Role } from "./roles";

export interface Society {
  id: string;
  name: string;
}

export interface MockSession {
  name: string;
  role: Role;
  societies: Society[];
  currentSocietyId: string;
}

/**
 * TEMPORARY stand-in for the real session.
 *
 * There is no auth backend yet (see the TODO in src/app/login/page.tsx)
 * so the app shell — role-aware nav, society switcher — has nothing
 * real to read. This hardcodes an Onward superadmin so both
 * superadmin-only nav items and the society switcher are visible to
 * build and demo against, across three placeholder societies.
 *
 * Replace with a real session read (from the auth cookie / a server
 * call) once login actually issues one. Every call site that reads
 * this should be easy to grep for: `getMockSession`.
 */
export function getMockSession(): MockSession {
  return {
    name: "Oluwatobi Adelesi",
    role: "onward_superadmin",
    societies: [
      { id: "abk-central", name: "Abeokuta Central Cooperative" },
      { id: "abk-north", name: "Abeokuta North Farmers Society" },
      { id: "abk-east", name: "Abeokuta East Traders Society" },
    ],
    currentSocietyId: "abk-central",
  };
}
