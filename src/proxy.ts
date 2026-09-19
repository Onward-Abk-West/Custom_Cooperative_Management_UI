import { NextRequest, NextResponse } from "next/server";

/**
 * Auth-guard shell.
 *
 * This only knows about the PRESENCE of a session token cookie — it does
 * not validate it against the API (that happens server-side per request,
 * and the API client's 401 handling covers an expired/invalid token).
 * Its job is just to keep an unauthenticated visitor out of the app shell
 * and keep an authenticated one out of the login screen and splash.
 *
 * The actual login flow (issuing this cookie) is a later task — for now
 * this proxy (Next.js 16 renamed "middleware" to "proxy") defines the
 * boundary the rest of the app is built against.
 *
 * "/" is the splash screen: public so an unauthenticated visitor sees it
 * before being sent to /login, but an authenticated visitor is bounced
 * straight past it to /dashboard rather than sitting through the splash
 * every time.
 */

const SESSION_COOKIE = "onward_session";

const PUBLIC_PATHS = ["/", "/login", "/forgot-pin"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) =>
    path === "/"
      ? pathname === "/"
      : pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (isPublicPath(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except static assets and Next.js internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
