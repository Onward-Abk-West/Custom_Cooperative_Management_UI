import { apiFetch, type ApiEnvelope } from "@/lib/api-client";

/**
 * POST /api/v1/developer-superadmin/societies/{societyId}/imports/dgt
 * (AbkWestCoop.Api's DeveloperSuperadminDgtImportsController). Developer
 * Superadmin only — bulk-imports members and their opening financial
 * balances for one society from the legacy "DGT" XLSX workbook used
 * before this system existed. Per DgtImportService: one accepted row
 * becomes one member (named `{societyCode}-{suffix:000000}`, suffix
 * taken from the row's MEM NO column) plus one financial-transaction
 * row per non-zero balance column; a row with any problem (missing
 * NAME, a MEM NO that isn't an integer 1-999999, a MEM NO duplicated
 * within the workbook or already in use, a non-numeric or negative
 * balance, a balance exceeding decimal(18,2)) is rejected individually
 * — the whole import still completes — and comes back in `rowErrors`.
 *
 * multipart/form-data, not JSON — hence apiFetch directly rather than
 * apiPost, and see the FormData carve-out in api-client.ts's apiFetch
 * (it must NOT set Content-Type: application/json for this body, or
 * the browser can't attach its own multipart boundary).
 *
 * transactionDate must be an ISO date string (yyyy-MM-dd) — the one
 * format DateOnly.TryParse on the backend accepts independent of
 * server culture; an <input type="date"> already produces this.
 *
 * The same workbook (identified by its file checksum) can only be
 * imported successfully once per society — a repeat upload comes back
 * as the DGT_IMPORT_ALREADY_COMPLETED code (409), not a generic error.
 */

export interface DgtImportRowErrorData {
  rowNumber: number;
  serialNumber: string | null;
  reasons: string[];
}

export interface DgtImportResultData {
  importId: string;
  societyId: string;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  membersCreated: number;
  financialRecordsCreated: number;
  rowErrors: DgtImportRowErrorData[];
}

export function importDgtWorkbook(societyId: string, file: File, transactionDate: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("transactionDate", transactionDate);
  return apiFetch<ApiEnvelope<DgtImportResultData>>(
    `/api/v1/developer-superadmin/societies/${societyId}/imports/dgt`,
    { method: "POST", body: form }
  );
}
