import { apiGet, apiPost, type ApiEnvelope } from "@/lib/api-client";
import type { Role } from "@/lib/roles";
import { isSuperadmin } from "@/lib/roles";

export type LoanStatus = "Approved" | "Disbursed" | "Paid";
export interface LoanItem {
  id: string;
  societyId: string;
  memberId: string;
  memberName: string;
  membershipNumber: string | null;
  principalAmount: number;
  totalRepaid: number;
  outstandingBalance: number;
  approvalDate: string;
  tenorMonths: number | null;
  status: LoanStatus;
  disbursedAtUtc: string | null;
  loanFormId: string;
  remarks: string | null;
  version: number;
  createdAtUtc: string;
}
export interface LoanPage {
  items: LoanItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
export interface LoanQuery { pageNumber: number; pageSize: number; status?: LoanStatus | ""; memberId?: string; startDate?: string; endDate?: string; }

function loansPath(role: Role, societyId: string) {
  if (role === "developer_superadmin") return `/api/v1/developer-superadmin/societies/${encodeURIComponent(societyId)}/loans`;
  if (role === "onward_superadmin") return `/api/v1/onward-superadmin/societies/${encodeURIComponent(societyId)}/loans`;
  return "/api/v1/loans";
}

export function listLoans(role: Role, societyId: string, query: LoanQuery) {
  const params = new URLSearchParams({ pageNumber: String(query.pageNumber), pageSize: String(query.pageSize) });
  if (query.status) params.set("status", query.status);
  if (query.memberId) params.set("memberId", query.memberId);
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);
  return apiGet<ApiEnvelope<LoanPage>>(`${loansPath(role, societyId)}?${params}`);
}

export function createLoan(role: Role, societyId: string, request: {
  memberId: string; amount: number; approvalDate: string; tenorMonths: number | null;
  loanFormId: string; remarks: string; idempotencyKey: string;
}) {
  return apiPost<ApiEnvelope<LoanItem>>(loansPath(role, societyId), request);
}

export function disburseLoan(role: Role, societyId: string, loanId: string) {
  return apiPost<ApiEnvelope<{ loan: LoanItem }>>(`${loansPath(role, societyId)}/${encodeURIComponent(loanId)}/disburse`);
}

export function recordLoanRepayment(role: Role, societyId: string, loanId: string, request: {
  amount: number; repaymentDate: string; idempotencyKey: string;
  referenceNumber: string | null; paymentMethod: "Cash" | "Transfer" | null;
}) {
  return apiPost<ApiEnvelope<{ loan: LoanItem; repaymentId: string; outstandingBalance: number }>>(
    `${loansPath(role, societyId)}/${encodeURIComponent(loanId)}/repayments`, request);
}

export function getLoanDocument(role: Role, societyId: string, loanId: string) {
  return apiGet<ApiEnvelope<{ url: string; fileName: string; contentType: string }>>(
    `${loansPath(role, societyId)}/${encodeURIComponent(loanId)}/document`);
}

interface CloudinaryAuthorization {
  uploadUrl: string; apiKey: string; timestamp: number; signature: string;
  publicId: string; resourceType: string; deliveryType: string;
  allowedFormats: string[]; maximumSizeBytes: number; expiresAtUtc: string;
  parameters: Record<string, string>;
}
interface LoanFormAuthorizations { loanForm: CloudinaryAuthorization; signature: CloudinaryAuthorization; }
interface UploadedLoanForm { id: string; societyId: string; memberId: string; }
interface CloudinaryUploadResult { public_id?: string; resource_type?: string; error?: { message?: string }; }

async function uploadFile(authorization: CloudinaryAuthorization, file: File) {
  if (file.size > authorization.maximumSizeBytes) throw new Error("The selected file exceeds the allowed size.");
  const form = new FormData();
  for (const [key, value] of Object.entries(authorization.parameters)) form.append(key, value);
  form.append("api_key", authorization.apiKey);
  form.append("signature", authorization.signature);
  form.append("file", file, file.name);
  const response = await fetch(authorization.uploadUrl, { method: "POST", body: form });
  const result = await response.json() as CloudinaryUploadResult;
  if (!response.ok || result.public_id !== authorization.publicId || !result.resource_type) {
    throw new Error(result.error?.message || "The signed loan document could not be uploaded.");
  }
  return { publicId: result.public_id, resourceType: result.resource_type };
}

export async function uploadLoanForm(role: Role, societyId: string, memberId: string,
  formFile: File, signatureFile?: File | null): Promise<UploadedLoanForm> {
  const path = role === "developer_superadmin"
    ? `/api/v1/developer-superadmin/societies/${encodeURIComponent(societyId)}/loan-forms`
    : role === "onward_superadmin"
      ? `/api/v1/onward-superadmin/societies/${encodeURIComponent(societyId)}/loan-forms`
      : "/api/v1/admin/loan-forms";
  const authorization = await apiPost<ApiEnvelope<LoanFormAuthorizations>>(`${path}/upload-authorization`, { memberId });
  if (!authorization.success || !authorization.data) throw new Error(authorization.message || "Document upload is not available.");
  const form = await uploadFile(authorization.data.loanForm, formFile);
  const signature = signatureFile ? await uploadFile(authorization.data.signature, signatureFile) : null;
  const saved = await apiPost<ApiEnvelope<UploadedLoanForm>>(path, {
    memberId,
    loanForm: form,
    signature,
  });
  if (!saved.success || !saved.data) throw new Error(saved.message || "The signed loan form could not be saved.");
  return saved.data;
}

export function canManageLoans(role: Role) {
  return isSuperadmin(role) || ["admin", "supervisor", "president"].includes(role);
}
