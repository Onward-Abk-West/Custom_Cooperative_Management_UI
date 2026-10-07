import { apiPost, apiPut, type ApiEnvelope } from "@/lib/api-client";

/**
 * Record (and now correct) a financial transaction against a member's
 * account. Matches AbkWestCoop.Api.Controllers.
 * FinancialTransactionsControllers — only two roles can create or
 * update one: Admin (implicitly scoped to their own society, like
 * createMemberAsSupervisor in members.ts — no societyId in the path or
 * body) and Developer Superadmin (any society, societyId in the path).
 * There is deliberately no Supervisor/President/Onward-Superadmin
 * create/update endpoint, and still no list/read endpoint at all — only
 * create and update-by-id exist on the backend today, so a transaction
 * can only ever be corrected right after creating it (the id from that
 * create response), never looked up later.
 */

/** Matches AbkWestCoop.Domain.Entities.FinancialCategoryValues.
 * ToStorageValue() exactly — these are the literal strings the backend
 * expects on create and returns on success, not the C# enum member
 * names. */
export const FINANCIAL_CATEGORIES = [
  "Shares",
  "Savings",
  "Normal Loan",
  "Car Loan",
  "Car Loan Savings",
  "Building Loan",
  "B. Loan Savings",
  "Okada Loan",
  "Okada Loan Savings",
  "Kasolayo",
  "Special Savings",
  "Land Savings",
  "Household",
  "Education Loan",
  "Furniture Loan",
] as const;
export type FinancialCategory = (typeof FINANCIAL_CATEGORIES)[number];

/** Matches AbkWestCoop.Contracts.FinancialTransactions.Responses.
 * CreateFinancialTransactionResponseData. `transactionDate` is a plain
 * "yyyy-MM-dd" string (DateOnly) — the same shape an
 * `<input type="date">` produces, so it round-trips with no parsing. */
export interface CreatedFinancialTransactionData {
  id: string;
  societyId: string;
  memberId: string;
  category: string;
  amount: number;
  transactionDate: string;
  createdByUserId: string;
  createdAtUtc: string;
}

/** POST /api/v1/admin/financial-transactions — Admin, own society implied. */
export function createFinancialTransactionAsAdmin(
  memberId: string,
  category: FinancialCategory,
  amount: number,
  transactionDate: string
) {
  return apiPost<ApiEnvelope<CreatedFinancialTransactionData>>(
    "/api/v1/admin/financial-transactions",
    { MemberId: memberId, Category: category, Amount: amount, TransactionDate: transactionDate }
  );
}

/** POST /api/v1/developer-superadmin/societies/{societyId}/financial-transactions. */
export function createFinancialTransactionForSociety(
  societyId: string,
  memberId: string,
  category: FinancialCategory,
  amount: number,
  transactionDate: string
) {
  return apiPost<ApiEnvelope<CreatedFinancialTransactionData>>(
    `/api/v1/developer-superadmin/societies/${societyId}/financial-transactions`,
    { MemberId: memberId, Category: category, Amount: amount, TransactionDate: transactionDate }
  );
}

/** Matches AbkWestCoop.Contracts.FinancialTransactions.Responses.
 * UpdateFinancialTransactionResponseData. No `memberId` on the request —
 * the backend's UpdateFinancialTransactionService only lets you correct
 * category/amount/date, never reassign which member a transaction
 * belongs to. A submit that exactly matches the existing values is not
 * an error — it comes back `success: true` with code
 * FINANCIAL_TRANSACTION_UNCHANGED instead of FINANCIAL_TRANSACTION_UPDATED. */
export interface UpdatedFinancialTransactionData {
  id: string;
  societyId: string;
  memberId: string;
  category: string;
  amount: number;
  transactionDate: string;
  createdByUserId: string;
  createdAtUtc: string;
}

/** PUT /api/v1/admin/financial-transactions/{transactionId} — Admin,
 * own society implied. */
export function updateFinancialTransactionAsAdmin(
  transactionId: string,
  category: FinancialCategory,
  amount: number,
  transactionDate: string
) {
  return apiPut<ApiEnvelope<UpdatedFinancialTransactionData>>(
    `/api/v1/admin/financial-transactions/${transactionId}`,
    { Category: category, Amount: amount, TransactionDate: transactionDate }
  );
}

/** PUT /api/v1/developer-superadmin/societies/{societyId}/financial-transactions/{transactionId}. */
export function updateFinancialTransactionForSociety(
  societyId: string,
  transactionId: string,
  category: FinancialCategory,
  amount: number,
  transactionDate: string
) {
  return apiPut<ApiEnvelope<UpdatedFinancialTransactionData>>(
    `/api/v1/developer-superadmin/societies/${societyId}/financial-transactions/${transactionId}`,
    { Category: category, Amount: amount, TransactionDate: transactionDate }
  );
}
