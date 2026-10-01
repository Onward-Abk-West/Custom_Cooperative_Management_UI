import { apiGet, apiPost, apiPut, type ApiEnvelope } from "@/lib/api-client";

/** Matches AbkWestCoop.Contracts.Members.Responses.MemberProfileResponseData. */
export interface MemberProfileData {
  userId: string;
  societyId: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  roles: string[];
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
