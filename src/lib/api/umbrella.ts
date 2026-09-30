import { apiGet, type ApiEnvelope } from "@/lib/api-client";

/** Matches AbkWestCoop.Contracts.Umbrellas.Responses.UmbrellaResponseData. */
export interface UmbrellaData {
  id: string;
  name: string;
}

/** GET /api/v1/developer-superadmin/umbrella */
export function getUmbrella() {
  return apiGet<ApiEnvelope<UmbrellaData>>("/api/v1/developer-superadmin/umbrella");
}
