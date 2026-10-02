import { apiGet, apiPost, type ApiEnvelope } from "@/lib/api-client";

/**
 * PIN reset — a two-stage flow split across two very different
 * surfaces, both against AbkWestCoop.Api's PinResetControllers.cs:
 *
 *  1. A signed-in Member requests a reset (no body — the request is
 *     implicitly "for me") via POST /api/v1/members/me/pin-reset-requests.
 *     This is NOT a "forgot my PIN" flow — it requires being
 *     authenticated, so it's really "I want my PIN changed," surfaced
 *     from /records rather than from the public login screens.
 *  2. An officer — Supervisor, President, Developer Superadmin, or
 *     Onward Superadmin — reviews the queue
 *     (GET /api/v1/pin-reset-requests) and approves one
 *     (POST .../{id}/approve), which mints a one-time reset credential
 *     shown ONCE, to hand to the member out of band (same UX as a
 *     newly created member's temporary credential — see
 *     api/members.ts's CreatedMemberData).
 *
 * The member then takes that reset credential to the public
 * /forgot-pin page, which spends it via verifyPinReset then
 * completePinReset below (POST /api/v1/auth/pin-reset/verify and
 * .../complete) to set a new PIN, then signs in normally at /login —
 * unlike first-time PIN setup, completing a PIN reset does NOT return
 * a session.
 */

export interface PinResetRequestData {
  id: string;
  userId: string;
  societyId: string;
  status: string;
  requestedAtUtc: string;
  approvedByUserId: string | null;
  approvedAtUtc: string | null;
  completedAtUtc: string | null;
}

export interface PinResetRequestPageData {
  items: PinResetRequestData[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PinResetApprovalData {
  resetCredential: string;
  expiresAtUtc: string;
}

/** POST /api/v1/members/me/pin-reset-requests — Member only, no body. */
export function requestPinReset() {
  return apiPost<ApiEnvelope<PinResetRequestData>>(
    "/api/v1/members/me/pin-reset-requests"
  );
}

/** GET /api/v1/pin-reset-requests — Supervisor, President, Developer
 * Superadmin, Onward Superadmin. */
export function listPendingPinResets(pageNumber = 1, pageSize = 20) {
  return apiGet<ApiEnvelope<PinResetRequestPageData>>(
    `/api/v1/pin-reset-requests?pageNumber=${pageNumber}&pageSize=${pageSize}`
  );
}

/** POST /api/v1/pin-reset-requests/{id}/approve — same officer roles. */
export function approvePinReset(requestId: string) {
  return apiPost<ApiEnvelope<PinResetApprovalData>>(
    `/api/v1/pin-reset-requests/${requestId}/approve`
  );
}

export interface VerifyPinResetData {
  pinSetupToken: string;
  expiresAtUtc: string;
}

/** POST /api/v1/auth/pin-reset/verify — public. Spends the reset
 * credential an officer approved above. */
export function verifyPinReset(resetCredential: string) {
  return apiPost<ApiEnvelope<VerifyPinResetData>>(
    "/api/v1/auth/pin-reset/verify",
    { ResetCredential: resetCredential },
    { skipAuthRetry: true }
  );
}

/** POST /api/v1/auth/pin-reset/complete — public. Returns no session
 * (unlike first-time PIN setup) — the member signs in normally at
 * /login afterward with their new PIN. */
export function completePinReset(pinSetupToken: string, pin: string) {
  return apiPost<ApiEnvelope<null>>(
    "/api/v1/auth/pin-reset/complete",
    { PinSetupToken: pinSetupToken, Pin: pin },
    { skipAuthRetry: true }
  );
}
