import { NextRequest, NextResponse } from "next/server";
import {
  apiBaseUrl,
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from "@/lib/server/refresh-cookie";

/**
 * POST   /api/session  — right after sign-in, the browser hands over the
 *                        refresh token it just received so it can be kept
 *                        in an httpOnly cookie.
 * DELETE /api/session  — sign-out: revokes the refresh token on the API
 *                        (best effort) and clears the cookie.
 */
export async function POST(request: NextRequest) {
  let body: { refreshToken?: unknown; refreshTokenExpiresAtUtc?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const token = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  if (!token || token.length > 4096) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  const expires =
    typeof body?.refreshTokenExpiresAtUtc === "string" ? body.refreshTokenExpiresAtUtc : null;

  const response = new NextResponse(null, { status: 204 });
  setRefreshCookie(response, token, expires);
  return response;
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(REFRESH_COOKIE)?.value;
  if (token) {
    try {
      await fetch(`${apiBaseUrl()}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ RefreshToken: token }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Best effort — the cookie is cleared regardless.
    }
  }
  const response = new NextResponse(null, { status: 204 });
  clearRefreshCookie(response);
  return response;
}
