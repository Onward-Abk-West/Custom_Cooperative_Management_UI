/**
 * Client-side API client for calls to the backend, once it exists.
 *
 * Assumed auth contract — nothing here is locked with the backend
 * yet, so flag it if the real API ends up shaped differently: login
 * returns a short-lived access token in the response BODY, held here
 * in memory only (never localStorage, to keep it out of reach of an
 * XSS payload); a long-lived refresh token lives in an httpOnly,
 * Secure cookie the browser sends automatically. `apiFetch` attaches
 * the access token as a Bearer header and sends credentials so that
 * cookie goes along; on a 401 it tries exactly one refresh
 * (POST /auth/refresh) before retrying the original request, and only
 * signs the user out (clears the token, redirects to /login) if the
 * refresh itself fails.
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
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken) return null;
    accessToken = data.accessToken;
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
