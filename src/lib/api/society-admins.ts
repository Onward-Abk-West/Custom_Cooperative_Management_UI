import { apiDelete, apiPost, type ApiEnvelope } from "@/lib/api-client";

/**
 * Assign/revoke a society's Admin role for a specific member — parallel
 * to society-assignments.ts's Supervisor/President helpers, but Admin
 * is many-per-society rather than one, so AssignSocietyAdminService
 * never asks for confirmation the way assignSupervisor/assignPresident
 * can: it either succeeds or rejects outright (ADMIN_ALREADY_ASSIGNED,
 * USER_INELIGIBLE_FOR_ADMIN — the target must already hold the Member
 * role and must not be a superadmin). Matches AbkWestCoop.Api.
 * Controllers.SocietyAdminsControllers — Supervisor (own society),
 * Developer Superadmin or Onward Superadmin (any society); Admin and
 * President cannot assign/revoke Admin themselves.
 */
export type SocietyAdminScope = "supervisor" | "developer-superadmin" | "onward-superadmin";

/** Matches AbkWestCoop.Contracts.Societies.Responses.AssignSocietyAdminResponseData. */
export interface AssignSocietyAdminData {
  userId: string;
  societyId: string;
  role: string;
}

/** Matches AbkWestCoop.Contracts.Societies.Responses.RevokeSocietyAdminResponseData. */
export interface RevokeSocietyAdminData {
  userId: string;
  societyId: string;
  role: string;
}

function adminPath(scope: SocietyAdminScope, societyId: string) {
  return `/api/v1/${scope}/societies/${societyId}/admin`;
}

/** POST /api/v1/{scope}/societies/{societyId}/admin. */
export function assignSocietyAdmin(scope: SocietyAdminScope, societyId: string, userId: string) {
  return apiPost<ApiEnvelope<AssignSocietyAdminData>>(adminPath(scope, societyId), {
    UserId: userId,
  });
}

/** DELETE /api/v1/{scope}/societies/{societyId}/admin/{userId}. */
export function revokeSocietyAdmin(scope: SocietyAdminScope, societyId: string, userId: string) {
  return apiDelete<ApiEnvelope<RevokeSocietyAdminData>>(`${adminPath(scope, societyId)}/${userId}`);
}
