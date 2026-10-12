/**
 * Client-side API client for calls to the backend.
 *
 * Auth contract, confirmed against AbkWestCoop.Api's AuthController:
 * login returns a short-lived access token AND a refresh token in the
 * response BODY. The access token is held here in JS memory only (never
 * localStorage). The refresh token is handed straight to the same-origin
 * /api/session route handler, which keeps it in an httpOnly cookie —
 * page scripts never read it again. `apiFetch` attaches the access token
 * as a Bearer header; on a 401 (which is also what happens on the first
 * call after a page reload, when the in-memory token is gone) it asks
 * /api/session/refresh for a new access token and retries the original
 * request once. It only signs the user out (clears the session cookies
 * and redirects to /login) when the refresh is definitively rejected; a
 * network or server error during refresh keeps the session.
 *
 * This is separate from src/proxy.ts's onward_session cookie check,
 * which only gates page navigation server-side — this client handles
 * the browser's actual data-fetching calls to the API origin. It's
 * also client-side only: the access token lives in JS memory, so
 * there's nothing for this module to read during server rendering. A
 * server component/action that needs the API should forward the
 * session cookie directly instead of importing this.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/**
 * Every AbkWestCoop.Api endpoint responds with this envelope shape,
 * success or failure. An error case (400/403/404/409/500) still comes
 * back as one of these, but apiFetch throws ApiError for any non-2xx
 * response with the parsed envelope as `err.body` — so callers only
 * ever see this type directly on the success path. Read `err.body`
 * (cast to ApiEnvelope<unknown>) for the specific `code` when a
 * catch block needs to branch on it rather than just showing
 * `err.message`.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type RefreshOutcome =
  | { kind: "ok"; token: string }
  /** The session is definitely over (no cookie, or the API rejected it). */
  | { kind: "invalid" }
  /** Could not find out (network / server error) — keep the session. */
  | { kind: "unavailable" };

/**
 * The refresh token is NOT held in JavaScript at all. It lives in an
 * httpOnly cookie that only the same-origin /api/session/refresh route
 * handler (src/app/api/session/refresh/route.ts) can read; that handler
 * calls POST /api/v1/auth/refresh and returns just a fresh access token.
 * This is what keeps a member signed in across a page reload: the
 * in-memory access token is gone after a reload, the first API call
 * 401s, and this silently re-issues it from the cookie.
 *
 * Concurrent 401s (a page firing several requests at once) share ONE
 * in-flight refresh. The API rotates the refresh token on every use, so
 * a second parallel refresh with the old token would be rejected and
 * sign the user out.
 */
let refreshInFlight: Promise<RefreshOutcome> | null = null;

function refreshAccessToken(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    refreshInFlight = requestNewAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function requestNewAccessToken(): Promise<RefreshOutcome> {
  try {
    const res = await fetch("/api/session/refresh", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.status === 401) return { kind: "invalid" };
    if (!res.ok) return { kind: "unavailable" };
    const body = (await res.json()) as { accessToken?: string };
    if (!body.accessToken) return { kind: "invalid" };
    accessToken = body.accessToken;
    return { kind: "ok", token: body.accessToken };
  } catch {
    return { kind: "unavailable" };
  }
}

function hasStringMessage(body: unknown): body is { message: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { message?: unknown }).message === "string"
  );
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface ApiFetchOptions extends RequestInit {
  /** Skip the automatic 401 -> refresh -> retry cycle — for the
   * refresh call itself, and the login call, so neither can loop. */
  skipAuthRetry?: boolean;
}

/**
 * Fetch wrapper for calls to the backend API, with auth-token
 * attachment and one automatic refresh-and-retry on a 401.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuthRetry, headers, ...rest } = options;

  const doFetch = async () => {
    const finalHeaders = new Headers(headers);
    if (accessToken) {
      finalHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
    if (
      rest.body &&
      !finalHeaders.has("Content-Type") &&
      !(rest.body instanceof FormData)
    ) {
      // A FormData body (the DGT import upload — see
      // api/dgt-import.ts) must NOT get this header: the browser sets
      // its own "multipart/form-data; boundary=..." when the fetch
      // body is a FormData instance, and overriding it here (even to
      // the same string, since we can't supply the boundary) breaks
      // server-side multipart parsing entirely.
      finalHeaders.set("Content-Type", "application/json");
    }
    return fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      credentials: "include",
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRetry) {
    const outcome = await refreshAccessToken();
    if (outcome.kind === "ok") {
      res = await doFetch();
    } else if (outcome.kind === "unavailable") {
      // Don't sign anyone out because the network or API blipped.
      throw new ApiError(
        503,
        "Could not refresh your session. Check your connection and try again."
      );
    } else {
      accessToken = null;
      if (typeof document !== "undefined") {
        // Mirror session.ts's endSession() cookie clears here too. This
        // module can't import session.ts without creating a cycle
        // (session.ts already imports setAccessToken from here), so
        // these two names are duplicated rather than shared — keep them
        // in sync with SESSION_INFO_COOKIE / AUTH_SESSION_COOKIE in
        // session.ts if either ever changes. (The httpOnly refresh
        // cookie was already cleared by /api/session/refresh.)
        document.cookie = "onward_session=; path=/; max-age=0";
        document.cookie = "onward_session_info=; path=/; max-age=0";
      }
      if (typeof window !== "undefined") {
        // Deliberately a hard navigation, not router.push(): this is a
        // plain module, not a component, so there's no router instance
        // to call, and a full reload is actually what we want here —
        // it guarantees any in-memory app state tied to the expired
        // session is thrown away rather than surviving a client-side
        // route transition.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
      }
      throw new ApiError(401, "Session expired");
    }
  }

  const body = await parseBody(res);

  if (!res.ok) {
    const message = hasStringMessage(body)
      ? body.message
      : res.statusText || "Request failed";
    throw new ApiError(res.status, message, body);
  }

  return body as T;
}

export function apiGet<T = unknown>(path: string, options?: ApiFetchOptions) {
  return apiFetch<T>(path, { ...options, method: "GET" });
}

export function apiPost<T = unknown>(
  path: string,
  data?: unknown,
  options?: ApiFetchOptions
) {
  return apiFetch<T>(path, {
    ...options,
    method: "POST",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function apiPut<T = unknown>(
  path: string,
  data?: unknown,
  options?: ApiFetchOptions
) {
  return apiFetch<T>(path, {
    ...options,
    method: "PUT",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function apiDelete<T = unknown>(
  path: string,
  options?: ApiFetchOptions
) {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}

export function apiPatch<T = unknown>(
  path: string,
  data?: unknown,
  options?: ApiFetchOptions
) {
  return apiFetch<T>(path, {
    ...options,
    method: "PATCH",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}
