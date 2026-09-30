import { setAccessToken } from "./api-client";
import type { Role } from "./roles";

/**
 * Real (non-mock) session info, established at login (src/app/login/page.tsx)
 * and at first-time PIN setup (src/app/first-time-signin/page.tsx) — see
 * `establishSession` below, the single place both call into.
 *
 * This is deliberately NOT the access/refresh token: those stay exactly
 * where api-client.ts already keeps them (access token in JS memory only,
 * refresh token wherever the backend puts it). This cookie carries only
 * the non-sensitive fields the *server-rendered* (app)/layout.tsx needs
 * to pick the right sidebar/nav for the signed-in role without waiting
 * on a client-side fetch — role, userId, societyId, and an identifier to
 * display. It is intentionally readable (not httpOnly): the whole point
 * is that both the server layout (via next/headers' cookies()) and
 * client components can read it directly.
 *
 * Known gap, not fixed here: api-client.ts's refreshAccessToken() posts
 * to /auth/refresh expecting the backend to have set an httpOnly refresh
 * cookie at login, but AbkWestCoop.Api currently returns the refresh
 * token in the JSON body instead (see PinLoginResponseData/AuthSessionData
 * below) and never sets that cookie. That means a hard refresh currently
 * loses the in-memory access token with no way to silently recover it —
 * the user is bounced back through /login. Out of scope for this pass;
 * flagging it here since it directly affects how "real" this session
 * feels across a reload.
 */

const SESSION_INFO_COOKIE = "onward_session_info";
const SESSION_INFO_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Shape returned by every endpoint that hands back a live session:
 * POST /api/v1/auth/login and POST /api/v1/auth/first-time/create-pin
 * both resolve to this exact data shape (AbkWestCoop.Contracts reuses
 * PinLoginResponseData for both — see AuthenticationController and
 * FirstTimeAuthenticationController on the backend).
 */
export interface AuthSessionData {
  userId: string;
  societyId: string | null;
  email: string;
  phoneNumber: string;
  roles: string[];
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  refreshTokenExpiresAtUtc: string;
}

export interface SessionInfo {
  userId: string;
  /** Highest-privilege role, per ROLE_PRECEDENCE — what the sidebar/nav
   * render against. */
  role: Role;
  /** Every backend role string mapped to the frontend Role union, in
   * case a caller ever needs the full set (the PRD's Supervisor/President
   * mutual-exclusivity means this is normally a single-element array). */
  roles: Role[];
  societyId: string | null;
  /** Display identity — the backend has no "name" field on a user, only
   * email/phoneNumber, so this is whichever of those is present. Real
   * names aren't available until/unless the API adds one. */
  displayName: string;
}

const BACKEND_ROLE_TO_FRONTEND: Record<string, Role> = {
  "Developer Superadmin": "developer_superadmin",
  "Onward Superadmin": "onward_superadmin",
  Supervisor: "supervisor",
  President: "president",
  Admin: "admin",
  Member: "member",
};

/** Highest-privilege first — determines which single Role a multi-role
 * user (not currently possible per the PRD, but cheap to handle) is
 * treated as by the sidebar. */
const ROLE_PRECEDENCE: Role[] = [
  "developer_superadmin",
  "onward_superadmin",
  "supervisor",
  "president",
  "admin",
  "member",
];

export function mapBackendRoles(backendRoles: string[]): Role[] {
  const mapped = backendRoles
    .map((role) => BACKEND_ROLE_TO_FRONTEND[role])
    .filter((role): role is Role => Boolean(role));
  // Fall back to the least-privileged role rather than crashing the
  // sidebar if the backend ever sends a role string this app doesn't
  // know about yet.
  return mapped.length > 0 ? mapped : ["member"];
}

function primaryRole(roles: Role[]): Role {
  for (const role of ROLE_PRECEDENCE) {
    if (roles.includes(role)) return role;
  }
  return roles[0] ?? "member";
}

export function sessionInfoFromAuthData(data: AuthSessionData): SessionInfo {
  const roles = mapBackendRoles(data.roles);
  return {
    userId: data.userId,
    role: primaryRole(roles),
    roles,
    societyId: data.societyId,
    displayName: data.email || data.phoneNumber || "Member",
  };
}

/** Parses the raw cookie value — usable from both a server component
 * (pass the value from next/headers' cookies().get(...)) and client
 * code (see readSessionInfo below). */
export function parseSessionInfoCookie(raw: string | undefined | null): SessionInfo | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SessionInfo;
    if (!parsed || typeof parsed !== "object" || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeSessionInfoCookie(info: SessionInfo): string {
  return encodeURIComponent(JSON.stringify(info));
}

export const SESSION_INFO_COOKIE_NAME = SESSION_INFO_COOKIE;

/**
 * Client-side: write the session-info cookie. Called once, right after
 * a successful login or first-time PIN setup — see establishSession.
 */
export function saveSessionInfo(info: SessionInfo) {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_INFO_COOKIE}=${serializeSessionInfoCookie(info)}; path=/; max-age=${SESSION_INFO_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** Client-side read — for client components that need the session
 * without waiting on a prop from the server layout (e.g. Sidebar's
 * society-switcher fetch, gated on role). */
export function readSessionInfo(): SessionInfo | null {
  if (typeof document === "undefined") return null;
  const row = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SESSION_INFO_COOKIE}=`));
  if (!row) return null;
  return parseSessionInfoCookie(row.slice(SESSION_INFO_COOKIE.length + 1));
}

export function clearSessionInfo() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_INFO_COOKIE}=; path=/; max-age=0`;
}

const AUTH_SESSION_COOKIE = "onward_session";
const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Single place that turns a successful login (POST /api/v1/auth/login)
 * or first-time PIN setup (POST /api/v1/auth/first-time/create-pin)
 * response into an established client session:
 *
 *  1. stores the access token in memory (api-client.ts) — never
 *     localStorage, per that module's own doc comment;
 *  2. writes the plain presence-only `onward_session` cookie src/proxy.ts
 *     gates authenticated routes on;
 *  3. writes the readable session-info cookie this module owns, which
 *     (app)/layout.tsx reads server-side to pick the right role-aware
 *     nav instead of getMockSession().
 *
 * login/page.tsx and first-time-signin/page.tsx both call this and
 * nothing else to finish signing a user in — keeping it in one place
 * means a future field (e.g. once the backend adds a display name)
 * only needs to change here.
 */
export function establishSession(data: AuthSessionData) {
  setAccessToken(data.accessToken);
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_SESSION_COOKIE}=1; path=/; max-age=${AUTH_SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
  }
  saveSessionInfo(sessionInfoFromAuthData(data));
}
