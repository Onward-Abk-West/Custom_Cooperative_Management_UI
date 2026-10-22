import { apiGet, apiPatch, apiPost, type ApiEnvelope } from "@/lib/api-client";

/** Matches AbkWestCoop.Contracts.Societies.Responses.SocietyResponseData. */
export interface SocietySummary {
  id: string;
  umbrellaId: string;
  name: string;
  /** Short membership-number prefix. Null until a Developer Superadmin
   * assigns one (see assignSocietyCode); a society cannot import members
   * without it. */
  code?: string | null;
}

export interface ListSocietiesData {
  items: SocietySummary[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** GET /api/v1/societies — Developer Superadmin, Onward Superadmin. */
export function listSocieties(pageNumber = 1, pageSize = 20) {
  return apiGet<ApiEnvelope<ListSocietiesData>>(
    `/api/v1/societies?pageNumber=${pageNumber}&pageSize=${pageSize}`
  );
}

/** GET /api/v1/societies/{id} */
export function getSociety(societyId: string) {
  return apiGet<ApiEnvelope<SocietySummary>>(`/api/v1/societies/${societyId}`);
}

/** POST /api/v1/developer-superadmin/societies */
export function createSociety(umbrellaId: string, name: string) {
  return apiPost<ApiEnvelope<SocietySummary>>(
    "/api/v1/developer-superadmin/societies",
    { UmbrellaId: umbrellaId, Name: name }
  );
}

/** Matches AbkWestCoop.Contracts.Societies.Responses.AssignSocietyCodeResponseData. */
export interface AssignedSocietyCodeData {
  societyId: string;
  code: string;
}

/** The backend's rule (SocietyCodeRules.TryNormalize): 2-10 letters or
 * digits. It normalises the value itself; the UI only pre-validates. */
export const SOCIETY_CODE_PATTERN = /^[A-Za-z0-9]{2,10}$/;

/**
 * PATCH /api/v1/developer-superadmin/societies/{societyId}/code —
 * Developer Superadmin only. Assigns the society's code exactly once:
 * a second call comes back 409 SOCIETY_CODE_ALREADY_ASSIGNED, and a code
 * already used by another society 409 SOCIETY_CODE_ALREADY_EXISTS.
 */
export function assignSocietyCode(societyId: string, code: string) {
  return apiPatch<ApiEnvelope<AssignedSocietyCodeData>>(
    `/api/v1/developer-superadmin/societies/${societyId}/code`,
    { Code: code }
  );
}
