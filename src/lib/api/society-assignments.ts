import { apiDelete, apiPost, type ApiEnvelope } from "@/lib/api-client";

/**
 * Assign/revoke Supervisor and President per society. Three role
 * consoles hit the same route shape with a different base path:
 * Developer Superadmin and Onward Superadmin can assign/revoke BOTH
 * roles on any society; a Supervisor can only assign/revoke the
 * President within their own society (never their own Supervisor
 * role). See AbkWestCoop.Api.Controllers: DeveloperSuperadminSociety-
 * SupervisorsController, OnwardSuperadminSocietySupervisorsController,
 * and the three controllers inside SocietyPresidentsControllers.cs.
 *
 * The assign call has three possible outcomes, not two: plain success,
 * a hard error (ApiError, thrown by apiFetch for any 4xx/5xx), or — for
 * a role that's already held by someone else — a 200 OK "confirmation
 * required" response asking the caller to resubmit with
 * confirmRoleChanges: true. Both success and confirmation arrive as
 * `success: true` with a different `code` and `data` shape, so branch
 * on `isConfirmationRequired(result.data)` rather than on HTTP status.
 */

export interface AssignmentSuccessData {
  userId: string;
  societyId: string;
  role: string;
}

export interface CurrentHolderData {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
}

export interface AssignmentConfirmationData {
  userId: string;
  societyId: string;
  confirmationRequired: true;
  /** "ReplaceSupervisor" | "ReplacePresident" | "RevokePresident" (the
   * assign-Supervisor call can require revoking an existing President
   * first, per PRD's mutual-exclusivity rule) */
  reason: string;
  currentSupervisor?: CurrentHolderData | null;
  currentPresident?: CurrentHolderData;
}

export type AssignmentResult = ApiEnvelope<
  AssignmentSuccessData | AssignmentConfirmationData
>;

export function isConfirmationRequired(
  data: AssignmentSuccessData | AssignmentConfirmationData | null
): data is AssignmentConfirmationData {
  return Boolean(data) && (data as AssignmentConfirmationData).confirmationRequired === true;
}

export interface RevokeSupervisorData {
  userId: string;
  societyId: string;
  revokedRole: string;
}

export interface RevokePresidentData {
  userId: string;
  societyId: string;
  role: string;
}

export type SocietyRoleScope = "developer-superadmin" | "onward-superadmin";
export type PresidentRoleScope = SocietyRoleScope | "supervisor";

function supervisorPath(scope: SocietyRoleScope, societyId: string) {
  return `/api/v1/${scope}/societies/${societyId}/supervisor`;
}

function presidentPath(scope: PresidentRoleScope, societyId: string) {
  return `/api/v1/${scope}/societies/${societyId}/president`;
}

export function assignSupervisor(
  scope: SocietyRoleScope,
  societyId: string,
  userId: string,
  confirmRoleChanges = false
) {
  return apiPost<AssignmentResult>(supervisorPath(scope, societyId), {
    UserId: userId,
    ConfirmRoleChanges: confirmRoleChanges,
  });
}

export function revokeSupervisor(scope: SocietyRoleScope, societyId: string) {
  return apiDelete<ApiEnvelope<RevokeSupervisorData>>(
    supervisorPath(scope, societyId)
  );
}

export function assignPresident(
  scope: PresidentRoleScope,
  societyId: string,
  userId: string,
  confirmRoleChanges = false
) {
  return apiPost<AssignmentResult>(presidentPath(scope, societyId), {
    UserId: userId,
    ConfirmRoleChanges: confirmRoleChanges,
  });
}

export function revokePresident(scope: PresidentRoleScope, societyId: string) {
  return apiDelete<ApiEnvelope<RevokePresidentData>>(
    presidentPath(scope, societyId)
  );
}
