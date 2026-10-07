import { apiGet, type ApiEnvelope } from "@/lib/api-client";

/** Matches AbkWestCoop.Contracts.Members.Responses.SocietyMemberResponseData.
 * `roles` is the user's full role set within the society — Member,
 * Admin, Supervisor and President can all appear here; this is the
 * whole roster, not a Member-only list. `status` is one of
 * MEMBER_STATUS_VALUES (see api/member-status.ts), defaulting to
 * "Active" on the backend. `profilePictureUrl` is read-only here — see
 * the same note on MemberProfileData in api/members.ts. */
export interface SocietyMemberSummary {
  userId: string;
  societyId: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  roles: string[];
  status: string;
  profilePictureUrl: string | null;
}

export interface ListSocietyMembersData {
  items: SocietyMemberSummary[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** GET /api/v1/societies/{societyId}/members — Developer Superadmin,
 * Onward Superadmin, Supervisor, President, Admin (SocietyMembersController;
 * the same reader list as GET /api/v1/members/{id}). A Supervisor/
 * President/Admin requesting a society other than their own gets back
 * an empty page rather than a 403 — the backend scopes the query, it
 * doesn't reject it (see SocietyDataScope.ScopeUsers). */
export function listSocietyMembers(societyId: string, pageNumber = 1, pageSize = 20) {
  return apiGet<ApiEnvelope<ListSocietyMembersData>>(
    `/api/v1/societies/${societyId}/members?pageNumber=${pageNumber}&pageSize=${pageSize}`
  );
}
