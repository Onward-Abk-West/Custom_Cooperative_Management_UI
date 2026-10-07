import { apiPost, type ApiEnvelope } from "@/lib/api-client";

/**
 * POST /api/v1/auth/identify (AbkWestCoop.Api's AuthController.Identify).
 *
 * The single entry point the unified /login page calls first: given just
 * an email or phone number, the backend reports which credential to
 * prompt for next, so this page never has to guess — or make the member
 * tell it — which of the three sign-in flows they're in: a brand-new
 * member who needs their temporary credential (first-time-signin's old
 * job), a member mid PIN-reset who has a one-time code to redeem
 * (forgot-pin's old job), a member whose PIN reset is requested but not
 * yet approved (nothing to enter yet), or a normal PIN login.
 *
 * nextStep mirrors the LOGIN_STEP constants below, which match
 * AbkWestCoop.Contracts' IdentifyAccountResponseData constants exactly
 * (Pin / FirstTime / PinResetCode / PinResetPending). Kept as a plain
 * string on the wire rather than a TS union so an unrecognized future
 * value degrades to the generic PIN prompt (see login/page.tsx's switch)
 * instead of a type error.
 *
 * A 404 here means no account matches the identifier — ApiError.message
 * already carries the backend's wording. A 429 means the per-IP rate
 * limit on this endpoint was hit (RateLimiting:AccountIdentify in the
 * API's appsettings.json) — callers should show a "try again shortly"
 * message rather than treating it as "account not found."
 */

export interface IdentifyAccountData {
  nextStep: string;
}

export const LOGIN_STEP = {
  pin: "Pin",
  firstTime: "FirstTime",
  pinResetCode: "PinResetCode",
  pinResetPending: "PinResetPending",
} as const;

export function identifyAccount(identifier: string) {
  return apiPost<ApiEnvelope<IdentifyAccountData>>(
    "/api/v1/auth/identify",
    { EmailOrPhoneNumber: identifier },
    { skipAuthRetry: true }
  );
}
