import { apiGet, type ApiEnvelope } from "@/lib/api-client";
import type { Role } from "@/lib/roles";
import { isSuperadmin } from "@/lib/roles";

export interface FinancialCategoryTotal {
  category: string;
  totalAmount: number;
  transactionCount: number;
}

export interface FinancialSummaryData {
  societyId: string;
  societyName: string;
  societyCode: string | null;
  totalAmount: number;
  transactionCount: number;
  categoryTotals: FinancialCategoryTotal[];
}

export function getFinancialSummary(role: Role, societyId: string) {
  const path = isSuperadmin(role)
    ? `/api/v1/${role === "developer_superadmin" ? "developer-superadmin" : "onward-superadmin"}/societies/${societyId}/financial-records/summary`
    : "/api/v1/financial-records/summary";
  return apiGet<ApiEnvelope<FinancialSummaryData>>(path);
}
