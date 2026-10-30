import { apiGet, apiPut, type ApiEnvelope } from "@/lib/api-client";

export interface MonthlyFinancialDuePeriod {
  startDate: string;
  endDate: string;
  dueDate: string;
  label: string;
}

export interface MonthlyFinancialImportSchedule {
  configured: boolean;
  dueDayOfMonth: number | null;
  duePeriods: MonthlyFinancialDuePeriod[];
}

const path = (societyId: string) =>
  `/api/v1/societies/${societyId}/monthly-financial-import-schedule`;

export function getMonthlyFinancialImportSchedule(societyId: string) {
  return apiGet<ApiEnvelope<MonthlyFinancialImportSchedule>>(path(societyId));
}

export function saveMonthlyFinancialImportSchedule(societyId: string, dueDayOfMonth: number) {
  return apiPut<ApiEnvelope<MonthlyFinancialImportSchedule>>(path(societyId), { dueDayOfMonth });
}
