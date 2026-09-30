import { apiGet, type ApiEnvelope } from "@/lib/api-client";

/** GET /api/v1/developer-superadmin/audit-logs — Developer Superadmin
 * only (AbkWestCoop.Api's DeveloperSuperadminAuditLogsController). */

export interface AuditLogEntryData {
  id: string;
  actorUserId: string;
  actorRole: string;
  societyId: string | null;
  action: string;
  affectedEntityType: string;
  affectedEntityId: string;
  occurredAtUtc: string;
}

export interface AuditLogPageData {
  items: AuditLogEntryData[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function listAuditLogs(pageNumber = 1, pageSize = 20) {
  return apiGet<ApiEnvelope<AuditLogPageData>>(
    `/api/v1/developer-superadmin/audit-logs?pageNumber=${pageNumber}&pageSize=${pageSize}`
  );
}
