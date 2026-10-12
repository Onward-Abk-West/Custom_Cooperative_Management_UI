import { NextRequest, NextResponse } from "next/server";
import {
  apiBaseUrl,
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from "@/lib/server/refresh-cookie";

interface RefreshEnvelope {
  success?: boolean;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAtUtc?: string;
    refreshTokenExpiresAtUtc?: string;
  } | null;
}

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/session/refresh — exchanges the httpOnly refresh cookie for
 * a new access token (and rotates the cookie). Answers:
 *
 *   200 { accessToken }  signed in
 *   401                  no cookie, or the API says the token is expired /
 *                        revoked / invalid -> the browser must sign out
 *   503                  the API could not be reached or errored -> the
 *                        cookie is KEPT, so a brief outage does not sign
 *                        anyone out
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ success: false }, { status: 401, headers: NO_STORE });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ RefreshToken: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ success: false }, { status: 503, headers: NO_STORE });
  }

  // A definite "no" from the API (4xx other than timeout / rate limit).
  if (
    upstream.status >= 400 &&
    upstream.status < 500 &&
    upstream.status !== 408 &&
    upstream.status !== 429
  ) {
    const rejected = NextResponse.json({ success: false }, { status: 401, headers: NO_STORE });
    clearRefreshCookie(rejected);
    return rejected;
  }
  if (!upstream.ok) {
    return NextResponse.json({ success: false }, { status: 503, headers: NO_STORE });
  }

  let envelope: RefreshEnvelope | null = null;
  try {
    envelope = (await upstream.json()) as RefreshEnvelope;
  } catch {
    envelope = null;
  }
  const data = envelope?.data;
  if (!envelope?.success || !data?.accessToken) {
    return NextResponse.json({ success: false }, { status: 503, headers: NO_STORE });
  }

  const response = NextResponse.json(
    { accessToken: data.accessToken, accessTokenExpiresAtUtc: data.accessTokenExpiresAtUtc ?? null },
    { headers: NO_STORE }
  );
  if (data.refreshToken) {
    setRefreshCookie(response, data.refreshToken, data.refreshTokenExpiresAtUtc);
  }
  return response;
}
