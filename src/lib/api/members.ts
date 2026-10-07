import { apiGet, apiPost, apiPut, type ApiEnvelope } from "@/lib/api-client";

/** Matches AbkWestCoop.Contracts.Members.Responses.MemberProfileResponseData.
 * `status` is one of MEMBER_STATUS_VALUES (see api/member-status.ts) —
 * "Active" unless the backend says otherwise. `profilePictureUrl` is a
 * Cloudinary-hosted image URL, null until the member (or whoever is
 * viewing on their behalf) sets one via api/profile-picture.ts — that
 * endpoint is self-service only (PUT/DELETE /api/v1/profile/profile-picture,
 * the authenticated user's own picture), so it's read-only here. */
export interface MemberProfileData {
  userId: string;
  societyId: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  roles: string[];
  status: string;
  profilePictureUrl: string | null;
}

/** GET /api/v1/members/me — Member role only. */
export function getMyProfile() {
  return apiGet<ApiEnvelope<MemberProfileData>>("/api/v1/members/me");
}

/** GET /api/v1/members/{id} — Developer Superadmin, Onward Superadmin,
 * Supervisor, President, Admin. */
export function getMemberProfile(memberId: string) {
  return apiGet<ApiEnvelope<MemberProfileData>>(`/api/v1/members/${memberId}`);
}

/** PUT /api/v1/members/{id} — Developer Superadmin, Supervisor only. */
export function updateMemberProfile(
  memberId: string,
  name: string,
  email: string,
  phoneNumber: string
) {
  return apiPut<ApiEnvelope<MemberProfileData>>(`/api/v1/members/${memberId}`, {
    Name: name,
    Email: email,
    PhoneNumber: phoneNumber,
  });
}

/** Matches AbkWestCoop.Contracts.Members.Responses.CreateMemberResponseData.
 * `nextAction` is always "FirstTimeAuthenticate" today — the value the
 * member's temporary credential should be handed to at
 * /first-time-signin (see api/first-time-auth.ts). */
export interface CreatedMemberData {
  userId: string;
  societyId: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  roles: string[];
  temporaryCredential: string;
  temporaryCredentialExpiresAtUtc: string;
  nextAction: string;
}

/** POST /api/v1/developer-superadmin/societies/{societyId}/members */
export function createMemberAsDeveloperSuperadmin(
  societyId: string,
  name: string,
  email: string,
  phoneNumber: string
) {
  return apiPost<ApiEnvelope<CreatedMemberData>>(
    `/api/v1/developer-superadmin/societies/${societyId}/members`,
    { Name: name, Email: email, PhoneNumber: phoneNumber }
  );
}

/** POST /api/v1/supervisor/members — implicitly scoped to the calling
 * Supervisor's own society; no societyId in the path or body. */
export function createMemberAsSupervisor(name: string, email: string, phoneNumber: string) {
  return apiPost<ApiEnvelope<CreatedMemberData>>("/api/v1/supervisor/members", {
    Name: name,
    Email: email,
    PhoneNumber: phoneNumber,
  });
}
