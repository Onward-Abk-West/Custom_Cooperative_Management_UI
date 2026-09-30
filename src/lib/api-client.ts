/**
 * Client-side API client for calls to the backend, once it exists.
 *
 * Auth contract, confirmed against AbkWestCoop.Api's AuthController:
 * login returns a short-lived access token AND a refresh token in the
 * response BODY (no httpOnly cookie involved at all), both held here
 * in memory only (never localStorage, to keep them out of reach of an
 * XSS payload — see setAccessToken/setRefreshToken below). `apiFetch`
 * attaches the access token as a Bearer header; on a 401 it tries
 * exactly one refresh (POST /api/v1/auth/refresh, sending the
 * in-memory refresh token in the body) before retrying the original
 * request, and only signs the user out (clears both tokens, the
 * session cookies, and redirects to /login) if the refresh itself
 * fails.
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
let refreshToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/**
 * Held in memory alongside the access token (never localStorage, same
 * rationale) because the backend does NOT set an httpOnly refresh
 * cookie — AuthController.Refresh/Logout both read the refresh token
 * from the request BODY (RefreshAuthenticationSessionRequest /
 * RevokeAuthenticationSessionRequest). session.ts's establishSession
 * is the only place this gets set, from the login/first-time-signin
 * response's `refreshToken` field.
 */
export function setRefreshToken(token: string | null) {
  refreshToken = token;
}

export function getRefreshToken() {
  return refreshToken;
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

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    // Correct path (api/v1/auth/refresh, matching every other endpoint
    // this client calls) and payload (the refresh token in the JSON
    // body — see the comment on setRefreshToken above for why this
    // can't rely on a cookie the backend never sets). This previously
    // pointed at /auth/refresh with no body and so could never
    // succeed; fixed as part of wiring up logout(), which depends on
    // the same in-memory refresh token this fixes the retrieval of.
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ RefreshToken: refreshToken }),
    });
    if (!res.ok) return null;
    const envelope = (await res.json()) as ApiEnvelope<{
      accessToken?: string;
      refreshToken?: string;
    }>;
    if (!envelope.success || !envelope.data?.accessToken) return null;
    accessToken = envelope.data.accessToken;
    if (envelope.data.refreshToken) refreshToken = envelope.data.refreshToken;
    return accessToken;
  } catch {
    return null;
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
    if (rest.body && !finalHeaders.has("Content-Type")) {
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
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      accessToken = null;
      refreshToken = null;
      if (typeof document !== "undefined") {
        // Mirror session.ts's endSession() cookie clears here too. This
        // module can't import session.ts without creating a cycle
        // (session.ts already imports setAccessToken/setRefreshToken
        // from here), so these two names are duplicated rather than
        // shared — keep them in sync with SESSION_INFO_COOKIE /
        // AUTH_SESSION_COOKIE in session.ts if either ever changes.
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
