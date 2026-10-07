import { apiGet, type ApiEnvelope } from "@/lib/api-client";

/** GET /api/v1/developer-superadmin/audit-logs — Developer Superadmin
 * only (AbkWestCoop.Api's DeveloperSuperadminAuditLogsController). Like
 * the Onward log below, actor/society/affected-entity names are resolved
 * server-side (by the shared AuditAffectedEntityNameResolver) so the UI
 * never has to show a raw id. */

export interface AuditLogEntryData {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorRole: string;
  societyId: string | null;
  societyName: string | null;
  action: string;
  affectedEntityType: string;
  affectedEntityId: string;
  affectedEntityName: string | null;
  occurredAtUtc: string;
}

export interface AuditLogPageData {
  items: AuditLogEntryData[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface DeveloperAuditLogFilters {
  societyId?: string;
  /** ISO 8601 UTC instants (inclusive on both ends). */
  fromUtc?: string;
  toUtc?: string;
}

export function listAuditLogs(
  filters: DeveloperAuditLogFilters = {},
  pageNumber = 1,
  pageSize = 20
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  });
  if (filters.societyId) params.set("societyId", filters.societyId);
  if (filters.fromUtc) params.set("fromUtc", filters.fromUtc);
  if (filters.toUtc) params.set("toUtc", filters.toUtc);
  return apiGet<ApiEnvelope<AuditLogPageData>>(
    `/api/v1/developer-superadmin/audit-logs?${params.toString()}`
  );
}

/** GET /api/v1/onward-superadmin/audit-logs — Onward Superadmin only
 * (AbkWestCoop.Api's OnwardSuperadminAuditLogsController). A separate,
 * filterable log from listAuditLogs above: it excludes every Developer
 * Superadmin event (those stay private to the Developer Superadmin, per
 * the PRD) and resolves actor/society/affected-entity names server-side
 * so the UI never has to show a raw id. */
export interface OnwardAuditLogEntryData {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorRole: string;
  societyId: string | null;
  societyName: string | null;
  action: string;
  affectedEntityType: string;
  affectedEntityId: string;
  affectedEntityName: string | null;
  occurredAtUtc: string;
}

export interface OnwardAuditLogPageData {
  items: OnwardAuditLogEntryData[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface OnwardAuditLogFilters {
  societyId?: string;
  /** One of the backend's ActorRole strings — "Onward Superadmin",
   * "Supervisor", "President", "Admin", or "Member". Never "Developer
   * Superadmin": no such row can ever appear in this log. */
  role?: string;
  /** ISO 8601 UTC instants (inclusive on both ends). */
  fromUtc?: string;
  toUtc?: string;
}

export function listOnwardAuditLogs(
  filters: OnwardAuditLogFilters = {},
  pageNumber = 1,
  pageSize = 20
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  });
  if (filters.societyId) params.set("societyId", filters.societyId);
  if (filters.role) params.set("role", filters.role);
  if (filters.fromUtc) params.set("fromUtc", filters.fromUtc);
  if (filters.toUtc) params.set("toUtc", filters.toUtc);
  return apiGet<ApiEnvelope<OnwardAuditLogPageData>>(
    `/api/v1/onward-superadmin/audit-logs?${params.toString()}`
  );
}
