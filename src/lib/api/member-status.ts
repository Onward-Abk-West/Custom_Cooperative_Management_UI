import { apiPatch, type ApiEnvelope } from "@/lib/api-client";

/**
 * Change a member's status (Active / Suspended / Retired/Exited /
 * Deceased). Matches AbkWestCoop.Api.Controllers.MemberStatusControllers
 * — Supervisor (own society), Developer Superadmin or Onward Superadmin
 * (any society) only; Admin and President have no status-change
 * endpoint on the backend at all, unlike updateMemberProfile's edit
 * form which is narrower than its own read endpoint but still exists
 * for both of those roles' use case. Every one of these three
 * controllers takes societyId explicitly in the path (unlike
 * createMemberAsSupervisor in members.ts, which is implicitly scoped) —
 * pass the member's own societyId (from MemberProfileData.societyId),
 * not the caller's.
 */
export type MemberStatusScope = "supervisor" | "developer-superadmin" | "onward-superadmin";

/** Matches AbkWestCoop.Domain.Entities.MemberStatusExtensions.ToApiValue()
 * exactly — "Retired/Exited" is the one value that doesn't match its
 * enum member name (RetiredExited). */
export const MEMBER_STATUS_VALUES = ["Active", "Suspended", "Retired/Exited", "Deceased"] as const;
export type MemberStatusValue = (typeof MEMBER_STATUS_VALUES)[number];

/** Matches AbkWestCoop.Contracts.Members.Responses.ChangeMemberStatusResponseData. */
export interface ChangeMemberStatusData {
  memberId: string;
  societyId: string;
  previousStatus: string;
  status: string;
}

/** PATCH /api/v1/{scope}/societies/{societyId}/members/{memberId}/status.
 * Returns 409 MEMBER_STATUS_UNCHANGED if `status` already matches the
 * member's current status — callers should avoid submitting a no-op
 * change rather than relying on that for feedback. */
export function changeMemberStatus(
  scope: MemberStatusScope,
  societyId: string,
  memberId: string,
  status: MemberStatusValue
) {
  return apiPatch<ApiEnvelope<ChangeMemberStatusData>>(
    `/api/v1/${scope}/societies/${societyId}/members/${memberId}/status`,
    { Status: status }
  );
}
