import { apiDownload, apiGet, type ApiEnvelope, type DownloadedFile } from "@/lib/api-client";
import type { Role } from "@/lib/roles";
import { isSuperadmin } from "@/lib/roles";

export type ReportType = "Transactions" | "Loans" | "Savings" | "Membership" | "MonthlyActivity";
export interface ReportMetric { label: string; amount: number | null; count: number | null; value: string | null; }
export interface ReportData {
  type: ReportType; societyId: string; societyName: string; cooperativeName: string | null;
  startDate: string | null; endDate: string | null; generatedAtUtc: string;
  summary: ReportMetric[]; categoryBreakdown: ReportMetric[];
  table: { columns: string[]; rows: Array<Array<string | null>> };
  pageNumber: number; pageSize: number; totalCount: number; totalPages: number;
}
export interface ReportQuery {
  type: ReportType; startDate?: string; endDate?: string; category?: string;
  includeDetails: boolean; pageNumber: number; pageSize: number; sections?: string[];
}

function reportBase(role: Role, societyId: string) {
  return isSuperadmin(role)
    ? `/api/v1/${role === "developer_superadmin" ? "developer-superadmin" : "onward-superadmin"}/societies/${encodeURIComponent(societyId)}/reports`
    : "/api/v1/reports";
}

function queryString(query: ReportQuery) {
  const params = new URLSearchParams({ type: query.type, includeDetails: String(query.includeDetails), pageNumber: String(query.pageNumber), pageSize: String(query.pageSize) });
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);
  if (query.category) params.set("category", query.category);
  for (const section of query.sections ?? []) params.append("sections", section);
  return params.toString();
}

export function readReport(role: Role, societyId: string, query: ReportQuery) {
  return apiGet<ApiEnvelope<ReportData>>(`${reportBase(role, societyId)}?${queryString(query)}`);
}

export function downloadReport(role: Role, societyId: string, query: ReportQuery,
  format: "excel" | "pdf"): Promise<DownloadedFile | null> {
  return apiDownload(`${reportBase(role, societyId)}/${format}?${queryString({ ...query, pageNumber: 1, pageSize: 100 })}`);
}
