import { setAccessToken, setRefreshToken, getRefreshToken, apiPost } from "./api-client";
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
 * Known gap, still not fixed here: both the access token AND the
 * refresh token (see setRefreshToken in api-client.ts) live in JS
 * memory only, by design (never localStorage). api-client.ts's
 * refreshAccessToken() now correctly POSTs the refresh token to
 * /api/v1/auth/refresh (this was previously broken — it hit the wrong
 * path with no body, expecting an httpOnly cookie the backend never
 * sets), so an expired *access* token recovers silently mid-session.
 * But a hard page reload still clears both in-memory tokens with
 * nothing to reconstruct them from, so the user is bounced back
 * through /login on refresh regardless. Fixing that for real needs
 * either a persisted (non-httpOnly, since this is a memory-only
 * client) refresh token store or a backend-set httpOnly cookie plus a
 * refresh call that doesn't require the token in the body at all.
 * Out of scope for this pass.
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
  setRefreshToken(data.refreshToken);
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_SESSION_COOKIE}=1; path=/; max-age=${AUTH_SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
  }
  saveSessionInfo(sessionInfoFromAuthData(data));
}

/**
 * Clears every trace of the client session — both in-memory tokens,
 * the plain presence cookie src/proxy.ts gates page navigation on, and
 * this module's readable session-info cookie — with no network call.
 * Called by logout() below, and mirrored (it can't import this module
 * without a cycle — see the comment there) by api-client.ts's own
 * "refresh failed" path, so an expired session cleans up exactly the
 * same way a deliberate logout does.
 */
export function endSession() {
  setAccessToken(null);
  setRefreshToken(null);
  clearSessionInfo();
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_SESSION_COOKIE}=; path=/; max-age=0`;
  }
}

/**
 * Deliberate sign-out — the Sidebar's "Log out" button calls this and
 * nothing else. Best-effort revokes the refresh token server-side
 * (POST /api/v1/auth/logout, AuthController.Logout) so it can't be
 * replayed, but a failed or skipped revoke (no refresh token on hand,
 * network error, token already expired/revoked) never blocks the
 * actual sign-out — the local session ends and the user lands on
 * /login regardless. Deliberately a hard navigation for the same
 * reason api-client.ts's own redirect is: it throws away any
 * in-memory app state tied to the ended session rather than letting
 * it survive a client-side route transition.
 */
export async function logout() {
  const token = getRefreshToken();
  if (token) {
    try {
      await apiPost("/api/v1/auth/logout", { RefreshToken: token }, { skipAuthRetry: true });
    } catch {
      // Best-effort — see doc comment above.
    }
  }
  endSession();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
