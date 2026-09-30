import { apiGet, apiPost, type ApiEnvelope } from "@/lib/api-client";

/** Matches AbkWestCoop.Contracts.Societies.Responses.SocietyResponseData. */
export interface SocietySummary {
  id: string;
  umbrellaId: string;
  name: string;
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
