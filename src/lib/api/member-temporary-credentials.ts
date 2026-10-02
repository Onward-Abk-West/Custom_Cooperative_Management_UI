import { apiPost, type ApiEnvelope } from "@/lib/api-client";

/**
 * Re-issue a member's first-time-PIN-setup temporary credential — for a
 * member who never completed onboarding and whose original credential
 * was lost or has expired. Matches AbkWestCoop.Api.Controllers.
 * MemberTemporaryCredentialsControllers — same three-role scope as
 * member-status.ts: Supervisor (own society), Developer Superadmin or
 * Onward Superadmin (any society). Distinct from pin-reset.ts, which
 * covers a member who already completed onboarding and needs their PIN
 * reset afterwards; this call is rejected with MEMBER_ALREADY_ONBOARDED
 * (409) once the member has set their own PIN.
 */
export type MemberCredentialScope = "supervisor" | "developer-superadmin" | "onward-superadmin";

/** Matches AbkWestCoop.Contracts.Members.Responses.
 * ReissueMemberTemporaryCredentialResponseData. */
export interface ReissuedCredentialData {
  memberId: string;
  societyId: string;
  temporaryCredential: string;
  temporaryCredentialExpiresAtUtc: string;
  nextAction: string;
}

/** POST /api/v1/{scope}/societies/{societyId}/members/{memberId}/temporary-credential/reissue. */
export function reissueMemberTemporaryCredential(
  scope: MemberCredentialScope,
  societyId: string,
  memberId: string
) {
  return apiPost<ApiEnvelope<ReissuedCredentialData>>(
    `/api/v1/${scope}/societies/${societyId}/members/${memberId}/temporary-credential/reissue`
  );
}
