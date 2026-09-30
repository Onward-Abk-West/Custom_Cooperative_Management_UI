import { apiPost, type ApiEnvelope } from "@/lib/api-client";
import type { AuthSessionData } from "@/lib/session";

/**
 * POST /api/v1/auth/first-time/authenticate and .../create-pin
 * (AbkWestCoop.Api's FirstTimeAuthenticationController). This is the
 * flow a brand-new member goes through exactly once: Developer
 * Superadmin or Supervisor creates them (see members.ts), which mints a
 * temporary credential; the member exchanges that credential here for a
 * short-lived pinSetupToken, then spends that token to set their real
 * 4-digit PIN and receive a full session — identical in shape to a
 * normal login (see AuthSessionData in src/lib/session.ts, which both
 * this and login/page.tsx use).
 */

export interface AuthenticateFirstTimeMemberData {
  pinSetupToken: string;
  pinSetupTokenExpiresAtUtc: string;
  nextAction: string;
}

export function authenticateFirstTimeMember(temporaryCredential: string) {
  return apiPost<ApiEnvelope<AuthenticateFirstTimeMemberData>>(
    "/api/v1/auth/first-time/authenticate",
    { TemporaryCredential: temporaryCredential },
    { skipAuthRetry: true }
  );
}

export function completeFirstTimePinSetup(pinSetupToken: string, pin: string) {
  return apiPost<ApiEnvelope<AuthSessionData>>(
    "/api/v1/auth/first-time/create-pin",
    { PinSetupToken: pinSetupToken, Pin: pin },
    { skipAuthRetry: true }
  );
}
