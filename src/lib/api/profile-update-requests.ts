import { apiGet, apiPost, type ApiEnvelope } from "@/lib/api-client";

/**
 * A Member has no self-service PUT /api/v1/members/{id} — only
 * Developer Superadmin and Supervisor can write a member profile
 * directly (see api/members.ts). Instead a Member proposes a change
 * here (POST .../me/profile-update-requests) and an Admin reviews it
 * (list/approve/reject below) — two roles hitting the same underlying
 * resource on AbkWestCoop.Api's MemberProfileUpdateRequestsController.cs,
 * mirrored by the two function groups in this one file.
 *
 * There is no GET for a Member's own submitted requests, so the
 * create call's own response is the only visibility a Member gets
 * into what they just proposed — see (app)/records/page.tsx.
 */

export interface ProfileUpdateRequestData {
  id: string;
  userId: string;
  societyId: string;
  proposedEmail: string | null;
  proposedPhoneNumber: string | null;
  status: string;
  requestedAtUtc: string;
  reviewedByUserId: string | null;
  reviewedAtUtc: string | null;
}

export interface ProfileUpdateRequestPageData {
  items: ProfileUpdateRequestData[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** POST /api/v1/members/me/profile-update-requests — Member only. */
export function createProfileUpdateRequest(email: string, phoneNumber: string) {
  return apiPost<ApiEnvelope<ProfileUpdateRequestData>>(
    "/api/v1/members/me/profile-update-requests",
    { Email: email, PhoneNumber: phoneNumber }
  );
}

/** GET /api/v1/admin/profile-update-requests — Admin only. */
export function listPendingProfileUpdateRequests(pageNumber = 1, pageSize = 20) {
  return apiGet<ApiEnvelope<ProfileUpdateRequestPageData>>(
    `/api/v1/admin/profile-update-requests?pageNumber=${pageNumber}&pageSize=${pageSize}`
  );
}

/** POST /api/v1/admin/profile-update-requests/{id}/approve */
export function approveProfileUpdateRequest(requestId: string) {
  return apiPost<ApiEnvelope<ProfileUpdateRequestData>>(
    `/api/v1/admin/profile-update-requests/${requestId}/approve`
  );
}

/** POST /api/v1/admin/profile-update-requests/{id}/reject */
export function rejectProfileUpdateRequest(requestId: string) {
  return apiPost<ApiEnvelope<ProfileUpdateRequestData>>(
    `/api/v1/admin/profile-update-requests/${requestId}/reject`
  );
}
