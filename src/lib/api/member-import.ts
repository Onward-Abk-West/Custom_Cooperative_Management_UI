import { apiDownload, apiFetch, type ApiEnvelope, type DownloadedFile } from "@/lib/api-client";
import { FINANCIAL_CATEGORIES } from "@/lib/api/financial-transactions";

/**
 * One-time onboarding import of a new society's existing member roster
 * and opening balances from an .xlsx workbook. Matches AbkWestCoop.Api's
 * DeveloperSuperadminMemberImportsController (it replaced the earlier
 * `/imports/dgt` route — that URL no longer exists) and
 * DeveloperSuperadminImportErrorsController. Developer Superadmin only.
 *
 * After this, members and their financial records are created by hand
 * (Members / Financial Records), so this is not a recurring tool.
 *
 * Preconditions the backend enforces (each a distinct 4xx code):
 *  - the society must already have a code (409 SOCIETY_CODE_REQUIRED) —
 *    see assignSocietyCode in societies.ts;
 *  - its membership-number sequence must be initialised
 *    (409 MEMBERSHIP_SEQUENCE_REQUIRED);
 *  - the same workbook (by checksum) can be imported successfully only
 *    once per society (409 MEMBER_IMPORT_ALREADY_COMPLETED);
 *  - the workbook must match the fixed layout below
 *    (400 INVALID_MEMBER_IMPORT_WORKBOOK, with the reasons in `message`).
 *
 * A bad *row* never fails the import: it is rejected on its own and
 * reported in `rowErrors` (and downloadable as a spreadsheet), while the
 * valid rows are still created. Responds 201 either way.
 */

/** The fixed workbook layout MemberImportWorkbookParser requires. */
export const MEMBER_IMPORT_WORKBOOK_SPEC = {
  sheetName: "Sheet1",
  headerRow: 2,
  firstDataRow: 3,
  columnCount: 18,
  identityColumns: ["S/N", "NAME", "MEM NO"],
  financialColumns: FINANCIAL_CATEGORIES,
} as const;

export interface MemberImportRowErrorData {
  rowNumber: number;
  serialNumber: string | null;
  reasons: string[];
}

/** Matches AbkWestCoop.Contracts.Imports.Responses.MemberImportResponseData. */
export interface MemberImportResultData {
  importId: string;
  societyId: string;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  membersCreated: number;
  financialRecordsCreated: number;
  rowErrors: MemberImportRowErrorData[];
}

/**
 * POST /api/v1/developer-superadmin/societies/{societyId}/imports/members
 *
 * multipart/form-data, not JSON — hence apiFetch directly rather than
 * apiPost (apiFetch deliberately leaves Content-Type to the browser for
 * a FormData body so the multipart boundary is attached).
 * transactionDate must be yyyy-MM-dd, which <input type="date"> yields.
 */
export function importMembers(societyId: string, file: File, transactionDate: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("transactionDate", transactionDate);
  return apiFetch<ApiEnvelope<MemberImportResultData>>(
    `/api/v1/developer-superadmin/societies/${societyId}/imports/members`,
    { method: "POST", body: form }
  );
}

/**
 * GET .../societies/{societyId}/imports/{importId}/errors/export — an
 * .xlsx of every rejected row. Resolves null when the import had no
 * errors (204). Throws ApiError 409 MEMBER_IMPORT_ERROR_DETAILS_UNAVAILABLE
 * for an old import that rejected rows before details were recorded.
 */
export function downloadMemberImportErrors(
  societyId: string,
  importId: string
): Promise<DownloadedFile | null> {
  return apiDownload(
    `/api/v1/developer-superadmin/societies/${societyId}/imports/${importId}/errors/export`
  );
}
