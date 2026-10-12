import type { NextResponse } from "next/server";

/**
 * The refresh token lives in an httpOnly cookie that only the
 * /api/session route handlers (server-side) can read or write. Page
 * scripts never see it after sign-in, so an XSS payload cannot lift it
 * out of storage the way it could from localStorage — and because it
 * survives a page reload, the in-memory access token can be silently
 * re-issued from it (see refreshAccessToken in src/lib/api-client.ts).
 *
 * `path` is scoped to /api/session so the browser attaches it to those
 * handlers only, never to page navigations or calls to the API origin.
 */
export const REFRESH_COOKIE = "onward_refresh";
export const REFRESH_COOKIE_PATH = "/api/session";

const FALLBACK_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MAX_AGE_CEILING_SECONDS = 60 * 60 * 24 * 90;

export function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
}

function maxAgeSeconds(expiresAtUtc: string | null | undefined): number {
  const expires = expiresAtUtc ? Date.parse(expiresAtUtc) : Number.NaN;
  if (Number.isNaN(expires)) return FALLBACK_MAX_AGE_SECONDS;
  const seconds = Math.floor((expires - Date.now()) / 1000);
  return Math.min(Math.max(seconds, 0), MAX_AGE_CEILING_SECONDS);
}

export function setRefreshCookie(
  response: NextResponse,
  token: string,
  expiresAtUtc?: string | null
) {
  const maxAge = maxAgeSeconds(expiresAtUtc);
  if (maxAge === 0) {
    clearRefreshCookie(response);
    return;
  }
  response.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge,
  });
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: 0,
  });
}
