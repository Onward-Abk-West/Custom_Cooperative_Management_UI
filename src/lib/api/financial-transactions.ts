import { apiDownload, apiFetch, apiPost, apiPut, type ApiEnvelope, type DownloadedFile } from "@/lib/api-client";

export const FINANCIAL_CATEGORIES = [
  "Shares", "Savings", "Normal Loan", "Car Loan", "Car Loan Savings",
  "Building Loan", "B. Loan Savings", "Okada Loan", "Okada Loan Savings",
  "Kasolayo", "Special Savings", "Land Savings", "Household", "Education Loan", "Furniture Loan",
] as const;
export type FinancialCategory = (typeof FINANCIAL_CATEGORIES)[number];
export type PaymentMethod = "Cash" | "Transfer";

export interface CreatedFinancialTransactionData {
  id: string; societyId: string; memberId: string; category: string; amount: number;
  transactionDate: string; createdByUserId: string; createdAtUtc: string;
  version: number; referenceNumber: string | null; paymentMethod: PaymentMethod | null;
}
export interface UpdatedFinancialTransactionData extends CreatedFinancialTransactionData {}

export interface MonthlyImportPreviewItem {
  rowNumber: number;
  /** ASP.NET serializes this enum as its numeric value by default. */
  kind: 0 | 1 | 2 | 3 | 4 | "New" | "Update" | "Unchanged" | "PotentialDuplicate" | "Invalid";
  membershipNumber: string;
  referenceNumber: string | null;
  category: string | null;
  amount: number;
  transactionDate: string;
  paymentMethod: PaymentMethod | null;
  warnings: string[];
}
export interface MonthlyImportPreviewData {
  success: boolean; code: string; previewId: string | null; periodId: string | null;
  confirmationToken: string | null; expiresAtUtc: string | null; items: MonthlyImportPreviewItem[];
}
export interface MonthlyImportExecutionData {
  success: boolean; code: string; created: number; updated: number; skipped: number;
}

function monthlyImportPath(societyId: string) {
  return `/api/v1/superadmin/societies/${societyId}/monthly-financial-imports`;
}

export function downloadMonthlyFinancialTemplate(societyId: string): Promise<DownloadedFile | null> {
  return apiDownload(`${monthlyImportPath(societyId)}/template`);
}

export function previewMonthlyFinancialImport(societyId: string, file: File, startDate: string, endDate: string) {
  const body = new FormData();
  body.set("file", file);
  body.set("startDate", startDate);
  body.set("endDate", endDate);
  return apiFetch<MonthlyImportPreviewData>(`${monthlyImportPath(societyId)}/preview`, {
    method: "POST", body,
  });
}

export function confirmMonthlyFinancialImport(societyId: string, previewId: string, confirmationToken: string) {
  return apiPost<{ success: boolean; code: string }>(`${monthlyImportPath(societyId)}/${previewId}/confirm`, {
    confirmationToken, acceptPotentialDuplicates: false,
  });
}

export function executeMonthlyFinancialImport(societyId: string, previewId: string, confirmationToken: string) {
  return apiPost<MonthlyImportExecutionData>(`${monthlyImportPath(societyId)}/${previewId}/import`, {
    confirmationToken,
  });
}

export function completeMonthlyFinancialPeriod(societyId: string, periodId: string) {
  return apiPost<{ success: boolean; code: string }>(`${monthlyImportPath(societyId)}/periods/${periodId}/complete`);
}

export function reopenMonthlyFinancialPeriod(societyId: string, periodId: string, reason: string) {
  return apiPost<{ success: boolean; code: string }>(`${monthlyImportPath(societyId)}/periods/${periodId}/reopen`, { reason });
}

/** POST /api/v1/admin/financial-transactions — Admin, own society implied. */
export function createFinancialTransactionAsAdmin(
  memberId: string, category: FinancialCategory, amount: number, transactionDate: string,
  referenceNumber: string, paymentMethod: PaymentMethod | ""
) {
  return apiPost<ApiEnvelope<CreatedFinancialTransactionData>>("/api/v1/admin/financial-transactions", {
    MemberId: memberId, Category: category, Amount: amount, TransactionDate: transactionDate,
    ReferenceNumber: referenceNumber || null, PaymentMethod: paymentMethod || null,
  });
}

/** POST /api/v1/developer-superadmin/societies/{societyId}/financial-transactions. */
export function createFinancialTransactionForSociety(
  societyId: string, memberId: string, category: FinancialCategory, amount: number,
  transactionDate: string, referenceNumber: string, paymentMethod: PaymentMethod | ""
) {
  return apiPost<ApiEnvelope<CreatedFinancialTransactionData>>(
    `/api/v1/developer-superadmin/societies/${societyId}/financial-transactions`, {
      MemberId: memberId, Category: category, Amount: amount, TransactionDate: transactionDate,
      ReferenceNumber: referenceNumber || null, PaymentMethod: paymentMethod || null,
    }
  );
}

export function updateFinancialTransactionAsAdmin(
  transactionId: string, category: FinancialCategory, amount: number, transactionDate: string,
  version: number, referenceNumber: string, paymentMethod: PaymentMethod | ""
) {
  return apiPut<ApiEnvelope<UpdatedFinancialTransactionData>>(
    `/api/v1/admin/financial-transactions/${transactionId}`, {
      Category: category, Amount: amount, TransactionDate: transactionDate, Version: version,
      ReferenceNumber: referenceNumber || null, PaymentMethod: paymentMethod || null,
    }
  );
}

export function updateFinancialTransactionForSociety(
  societyId: string, transactionId: string, category: FinancialCategory, amount: number,
  transactionDate: string, version: number, referenceNumber: string, paymentMethod: PaymentMethod | ""
) {
  return apiPut<ApiEnvelope<UpdatedFinancialTransactionData>>(
    `/api/v1/developer-superadmin/societies/${societyId}/financial-transactions/${transactionId}`, {
      Category: category, Amount: amount, TransactionDate: transactionDate, Version: version,
      ReferenceNumber: referenceNumber || null, PaymentMethod: paymentMethod || null,
    }
  );
}
