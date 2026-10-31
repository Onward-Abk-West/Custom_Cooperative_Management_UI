"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { Money } from "@/components/money/MoneyPopup";
import { listSocietyMembers, type SocietyMemberSummary } from "@/lib/api/society-members";
import { canManageLoans, createLoan, disburseLoan, getLoanDocument, listLoans, recordLoanRepayment, uploadLoanForm, type LoanItem, type LoanStatus } from "@/lib/api/loans";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";
import type { Role } from "@/lib/roles";
import { confirmAction, showError, showSuccess } from "@/lib/feedback";

const PAGE_SIZE = 25;
const STATUSES: Array<LoanStatus | ""> = ["", "Approved", "Disbursed", "Paid"];

function today() { return new Date().toISOString().slice(0, 10); }
function newIdempotencyKey() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

export default function LoansPage() {
  const { societyId: selectedSociety } = useSociety();
  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState("");
  const [rows, setRows] = useState<LoanItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState({ status: "" as LoanStatus | "", startDate: "", endDate: "", memberId: "" });
  const [draft, setDraft] = useState(filters);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOptions, setMemberOptions] = useState<SocietyMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<LoanItem | null>(null);
  const [repayLoan, setRepayLoan] = useState<LoanItem | null>(null);
  const [disbursingId, setDisbursingId] = useState<string | null>(null);
  const societyId = role === "developer_superadmin" || role === "onward_superadmin" ? selectedSociety : ownSocietyId;

  useEffect(() => {
    const session = readSessionInfo();
    setRole(session?.role ?? null);
    setOwnSocietyId(session?.societyId ?? "");
  }, []);

  useEffect(() => {
    if (!role || !societyId) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    listLoans(role, societyId, { pageNumber, pageSize, ...filters })
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) throw new Error(response.message || "Loan records could not be loaded.");
        setRows(response.data.items);
        setTotalCount(response.data.totalCount);
        setTotalPages(response.data.totalPages);
      })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : "Loan records could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role, societyId, pageNumber, pageSize, filters, reload]);

  useEffect(() => {
    if (!societyId || role === "member") { setMemberOptions([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      listSocietyMembers(societyId, 1, 25, memberSearch)
        .then((response) => { if (!cancelled && response.success && response.data) setMemberOptions(response.data.items.filter((m) => m.roles.includes("Member") && m.status === "Active")); })
        .catch(() => { if (!cancelled) setMemberOptions([]); });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [role, societyId, memberSearch]);

  const canManage = role ? canManageLoans(role) : false;
  const isMember = role === "member";
  const refresh = useCallback(() => setReload((v) => v + 1), []);

  if (!role) return <p className="text-sm text-brand-ink/60">Loading…</p>;
  if (!canManage && !isMember) return <p className="text-sm text-brand-ink/60">Loan records are not available for your role.</p>;
  if (!societyId) return <p className="rounded-2xl border border-dashed border-brand-line p-6 text-sm text-brand-ink/60">Choose a society from the sidebar to view its loan records.</p>;

  function applyFilters(event: FormEvent) { event.preventDefault(); setFilters({ ...draft }); setPageNumber(1); }

  return <main className="flex min-w-0 flex-col gap-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="font-heading text-2xl font-bold text-heading">{isMember ? "My Loans" : "Loans"}</h1><p className="mt-1 max-w-2xl text-sm text-brand-ink/60">{isMember ? "View your loan balances, repayments, and status." : "Track approved loans, disbursements, repayments, outstanding balances, and signed forms."}</p></div>
      {canManage && <button type="button" onClick={() => setCreateOpen(true)} className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-brand-cream transition hover:brightness-110">+ Loan Entry</button>}
    </header>

    <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 rounded-2xl bg-surface-card p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-semibold text-heading">Status<select value={draft.status} onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value as LoanStatus | "" }))} className="mt-1 w-full rounded-xl border border-brand-line bg-surface-card px-3 py-2 text-sm font-normal text-brand-ink">{STATUSES.map((status) => <option key={status || "all"} value={status}>{status || "All statuses"}</option>)}</select></label>
      {!isMember && <label className="text-xs font-semibold text-heading">Search members<input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Name, phone, number" className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2 text-sm font-normal text-brand-ink" /><select aria-label="Filter by member" value={draft.memberId} onChange={(e) => setDraft((v) => ({ ...v, memberId: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-surface-card px-3 py-2 text-sm font-normal text-brand-ink"><option value="">All members</option>{memberOptions.map((m) => <option key={m.userId} value={m.userId}>{m.name || m.phoneNumber || m.email || "Member"}</option>)}</select></label>}
      <label className="text-xs font-semibold text-heading">Approved from<input type="date" value={draft.startDate} onChange={(e) => setDraft((v) => ({ ...v, startDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2 text-sm font-normal text-brand-ink" /></label>
      <label className="text-xs font-semibold text-heading">Approved to<input type="date" value={draft.endDate} onChange={(e) => setDraft((v) => ({ ...v, endDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2 text-sm font-normal text-brand-ink" /></label>
      <div className="flex items-end gap-2"><button disabled={loading} className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-brand-cream disabled:opacity-50">Apply filters</button><button type="button" onClick={() => { setDraft({ status: "", startDate: "", endDate: "", memberId: "" }); setFilters({ status: "", startDate: "", endDate: "", memberId: "" }); setPageNumber(1); }} className="rounded-full border border-brand-line px-4 py-2 text-sm">Clear</button></div>
    </form>

    {error && <p role="alert" className="rounded-xl bg-status-bad/10 p-3 text-sm text-status-bad">{error}</p>}
    {loading ? <div className="animate-pulse rounded-2xl bg-surface-card p-7 text-sm text-brand-ink/60">Loading loans…</div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-brand-line p-8 text-center text-sm text-brand-ink/60">No loans match these filters.</div> :
      <div className="overflow-x-auto rounded-2xl bg-surface-card p-2"><Table className="min-w-[900px]"><TableHead className="border-b border-brand-line/70 bg-transparent"><TableRow>{!isMember && <TableHeaderCell>Member</TableHeaderCell>}<TableHeaderCell>Approved</TableHeaderCell><TableHeaderCell>Tenor</TableHeaderCell><TableHeaderCell>Principal</TableHeaderCell><TableHeaderCell>Repaid</TableHeaderCell><TableHeaderCell>Outstanding</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell><TableHeaderCell>{isMember ? "Details" : "Actions"}</TableHeaderCell></TableRow></TableHead><TableBody>{rows.map((loan) => <TableRow key={loan.id}>{!isMember && <TableCell><span className="font-medium">{loan.memberName}</span>{loan.membershipNumber && <span className="block text-xs text-brand-ink/50">{loan.membershipNumber}</span>}</TableCell>}<TableCell className="whitespace-nowrap">{loan.approvalDate}</TableCell><TableCell>{loan.tenorMonths ? `${loan.tenorMonths} months` : "—"}</TableCell><TableCell><Money value={loan.principalAmount} /></TableCell><TableCell><Money value={loan.totalRepaid} /></TableCell><TableCell className="font-semibold"><Money value={loan.outstandingBalance} /></TableCell><TableCell><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${loan.status === "Paid" ? "bg-status-good/15 text-status-good" : loan.status === "Disbursed" ? "bg-brand-green/15 text-brand-green-deep" : "bg-brand-gold/20 text-brand-gold-dark"}`}>{loan.status}</span></TableCell><TableCell><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSelected(loan)} className="font-semibold text-brand-green-deep hover:underline">Details</button>{canManage && loan.status === "Approved" && <button type="button" disabled={disbursingId === loan.id} onClick={() => void handleDisburse(loan)} className="font-semibold text-brand-green-deep hover:underline disabled:opacity-50">{disbursingId === loan.id ? "Disbursing…" : "Disburse"}</button>}{canManage && loan.status === "Disbursed" && loan.outstandingBalance > 0 && <button type="button" onClick={() => setRepayLoan(loan)} className="font-semibold text-brand-green-deep hover:underline">Record repayment</button>}</div></TableCell></TableRow>)}</TableBody></Table></div>}
    {!loading && <Pagination pageNumber={pageNumber} pageSize={pageSize} totalCount={totalCount} totalPages={totalPages} onPageChange={setPageNumber} onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }} />}

    {createOpen && canManage && <LoanEntryModal role={role} societyId={societyId} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refresh(); }} />}
    {repayLoan && <RepaymentModal loan={repayLoan} role={role} societyId={societyId} onClose={() => setRepayLoan(null)} onSaved={() => { setRepayLoan(null); refresh(); }} />}
    {selected && <LoanDetails loan={selected} role={role} societyId={societyId} onClose={() => setSelected(null)} />}
  </main>;

  async function handleDisburse(loan: LoanItem) {
    if (!role || !societyId) return;
    if (!await confirmAction("Disburse this loan?", `${loan.memberName} · ₦${loan.principalAmount.toLocaleString()}. The loan will become eligible for repayments.`, "Disburse loan")) return;
    setDisbursingId(loan.id);
    try {
      const response = await disburseLoan(role, societyId, loan.id);
      if (!response.success) throw new Error(response.message || "Loan disbursement failed.");
      await showSuccess("Loan disbursed", `${loan.memberName}'s loan is now eligible for repayments.`);
      refresh();
    } catch (err) { await showError("Loan not disbursed", err instanceof Error ? err.message : "Please try again."); }
    finally { setDisbursingId(null); }
  }
}

function LoanEntryModal({ role, societyId, onClose, onCreated }: { role: Role; societyId: string; onClose: () => void; onCreated: () => void }) {
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState<SocietyMemberSummary[]>([]);
  const [memberId, setMemberId] = useState("");
  const [memberLoading, setMemberLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [approvalDate, setApprovalDate] = useState(today());
  const [tenor, setTenor] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loanForm, setLoanForm] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef<string | null>(null);
  const uploadedFormId = useRef<string | null>(null);
  const selectedMember = useMemo(() => members.find((member) => member.userId === memberId), [members, memberId]);

  useEffect(() => {
    let cancelled = false;
    setMemberLoading(true);
    const timer = window.setTimeout(() => {
      listSocietyMembers(societyId, 1, 25, memberSearch)
        .then((response) => { if (!cancelled && response.success && response.data) setMembers(response.data.items.filter((member) => member.roles.includes("Member") && member.status === "Active")); })
        .catch(() => { if (!cancelled) setError("Member search could not be loaded."); })
        .finally(() => { if (!cancelled) setMemberLoading(false); });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [societyId, memberSearch]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!memberId || !amount || Number(amount) <= 0 || !approvalDate || !loanForm) {
      setError("Choose an active member, enter a valid amount and approval date, and attach the signed loan form."); return;
    }
    if (!await confirmAction("Create this loan entry?", `Approve ₦${Number(amount).toLocaleString()} for ${selectedMember?.name ?? "the selected member"}? This does not disburse funds.`, "Create loan")) return;
    setSubmitting(true);
    try {
      if (!requestKey.current) requestKey.current = newIdempotencyKey();
      if (!uploadedFormId.current) {
        const uploaded = await uploadLoanForm(role, societyId, memberId, loanForm, signature);
        uploadedFormId.current = uploaded.id;
      }
      const response = await createLoan(role, societyId, {
        memberId, amount: Number(amount), approvalDate, tenorMonths: tenor ? Number(tenor) : null,
        loanFormId: uploadedFormId.current, remarks, idempotencyKey: requestKey.current,
      });
      if (!response.success || !response.data) throw new Error(response.message || "The loan could not be recorded.");
      await showSuccess("Loan approved", `${selectedMember?.name ?? "Member"} · ₦${Number(amount).toLocaleString()}. Disburse it before recording repayments.`);
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "The loan could not be recorded.";
      setError(message); await showError("Loan not recorded", message);
    } finally { setSubmitting(false); }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-3 sm:p-5" role="presentation" onClick={onClose}><section role="dialog" aria-modal="true" aria-labelledby="loan-entry-heading" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface-card p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><h2 id="loan-entry-heading" className="font-heading text-xl font-bold text-heading">Loan Entry</h2><p className="mt-1 text-sm text-brand-ink/60">Approval creates the record only. Disburse it separately when funds are issued.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 text-2xl leading-none">×</button></div>
    <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold sm:col-span-2">Find active member<input value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); setMemberId(""); }} placeholder="Search by name, phone, or membership number" className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Member<select required value={memberId} onChange={(e) => setMemberId(e.target.value)} disabled={memberLoading} className="mt-1 w-full rounded-xl border border-brand-line bg-surface-card px-3 py-2.5 text-sm font-normal"><option value="">{memberLoading ? "Searching…" : "Select an active member"}</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.name || member.phoneNumber || member.email || "Member"}{member.phoneNumber ? ` · ${member.phoneNumber}` : ""}</option>)}</select></label>
      <label className="text-sm font-semibold">Loan amount<input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label>
      <label className="text-sm font-semibold">Approval date<input required type="date" max={today()} value={approvalDate} onChange={(e) => setApprovalDate(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label>
      <label className="text-sm font-semibold">Tenor (months, optional)<input type="number" min="1" max="600" value={tenor} onChange={(e) => setTenor(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label>
      <div className="rounded-2xl border border-brand-line bg-brand-line/10 p-4">
        <p className="text-sm font-semibold text-heading">Signed loan form <span className="text-status-bad">*</span></p>
        <p className="mt-1 text-xs text-brand-ink/60">Upload a signed form as PDF, JPG, or PNG.</p>
        <label htmlFor="loan-signed-form" className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-green/50 bg-surface-card px-3 py-4 text-center transition hover:border-brand-green hover:bg-brand-green/5 focus-within:ring-2 focus-within:ring-brand-gold/50">
          <input id="loan-signed-form" required type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => { setLoanForm(e.target.files?.[0] ?? null); uploadedFormId.current = null; }} className="sr-only" />
          <span className="text-sm font-semibold text-brand-green-deep">{loanForm ? "Change signed form" : "Choose signed loan form"}</span>
          <span className="max-w-full break-all text-xs text-brand-ink/60">{loanForm?.name ?? "PDF, JPG, or PNG"}</span>
        </label>
      </div>
      <div className="rounded-2xl border border-brand-line bg-brand-line/10 p-4">
        <p className="text-sm font-semibold text-heading">Separate signature image <span className="font-normal text-brand-ink/50">(optional)</span></p>
        <p className="mt-1 text-xs text-brand-ink/60">Add a signature image if it is separate from the signed form.</p>
        <label htmlFor="loan-signature-image" className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-line bg-surface-card px-3 py-4 text-center transition hover:border-brand-green/70 hover:bg-brand-green/5 focus-within:ring-2 focus-within:ring-brand-gold/50">
          <input id="loan-signature-image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => { setSignature(e.target.files?.[0] ?? null); uploadedFormId.current = null; }} className="sr-only" />
          <span className="text-sm font-semibold text-brand-green-deep">{signature ? "Change signature image" : "Choose signature image"}</span>
          <span className="max-w-full break-all text-xs text-brand-ink/60">{signature?.name ?? "JPG or PNG"}</span>
        </label>
      </div>
      <label className="text-sm font-semibold sm:col-span-2">Remarks<textarea maxLength={1000} rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label>
      {error && <p role="alert" className="rounded-xl bg-status-bad/10 p-3 text-sm text-status-bad sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} disabled={submitting} className="rounded-full border border-brand-line px-4 py-2.5 text-sm">Cancel</button><button type="submit" disabled={submitting} className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-brand-cream disabled:opacity-60">{submitting ? "Submitting…" : "Submit"}</button></div>
    </form>
  </section></div>;
}

function RepaymentModal({ loan, role, societyId, onClose, onSaved }: { loan: LoanItem; role: Role; societyId: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState<"" | "Cash" | "Transfer">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    const value = Number(amount);
    if (!value || value <= 0 || value > loan.outstandingBalance) { setError(`Enter an amount up to ₦${loan.outstandingBalance.toLocaleString()}.`); return; }
    if (!await confirmAction("Record this repayment?", `${loan.memberName} · ₦${value.toLocaleString()}`, "Record repayment")) return;
    setSaving(true);
    try {
      const response = await recordLoanRepayment(role, societyId, loan.id, {
        amount: value, repaymentDate: date, idempotencyKey: key.current,
        referenceNumber: reference || null, paymentMethod: method || null,
      });
      if (!response.success) throw new Error(response.message || "The repayment could not be recorded.");
      await showSuccess("Repayment recorded", `New balance: ₦${response.data?.outstandingBalance.toLocaleString() ?? "0"}`);
      onSaved();
    } catch (err) { const message = err instanceof Error ? err.message : "The repayment could not be recorded."; setError(message); await showError("Repayment not recorded", message); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-3" role="presentation" onClick={onClose}><section role="dialog" aria-modal="true" aria-labelledby="repayment-heading" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-surface-card p-6 shadow-2xl"><div className="flex justify-between gap-3"><div><h2 id="repayment-heading" className="font-heading text-xl font-bold">Record loan repayment</h2><p className="mt-1 text-sm text-brand-ink/60">Outstanding: ₦{loan.outstandingBalance.toLocaleString()}</p></div><button type="button" aria-label="Close" onClick={onClose} className="text-2xl">×</button></div><form onSubmit={submit} className="mt-4 grid gap-3"><label className="text-sm font-semibold">Amount<input required type="number" min="0.01" max={loan.outstandingBalance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label><label className="text-sm font-semibold">Date<input required type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label><label className="text-sm font-semibold">Payment method<select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="mt-1 w-full rounded-xl border border-brand-line bg-surface-card px-3 py-2.5 text-sm font-normal"><option value="">Select method</option><option value="Cash">Cash</option><option value="Transfer">Transfer</option></select></label><label className="text-sm font-semibold">Reference (optional)<input maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label>{error && <p role="alert" className="rounded-xl bg-status-bad/10 p-3 text-sm text-status-bad">{error}</p>}<div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-full border border-brand-line px-4 py-2">Cancel</button><button disabled={saving} className="rounded-full bg-brand-green px-4 py-2 font-semibold text-brand-cream disabled:opacity-60">{saving ? "Recording…" : "Record repayment"}</button></div></form></section></div>;
}

function LoanDetails({ loan, role, societyId, onClose }: { loan: LoanItem; role: Role; societyId: string; onClose: () => void }) {
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  async function openDocument() {
    setDocumentLoading(true); setDocumentError(null);
    try {
      const response = await getLoanDocument(role, societyId, loan.id);
      if (!response.success || !response.data?.url) throw new Error(response.message || "The signed loan form is not available.");
      window.location.assign(response.data.url);
    } catch (err) { setDocumentError(err instanceof Error ? err.message : "The signed loan form is unavailable."); }
    finally { setDocumentLoading(false); }
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-3" role="presentation" onClick={onClose}><section role="dialog" aria-modal="true" aria-labelledby="loan-details-heading" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 id="loan-details-heading" className="font-heading text-xl font-bold">Loan details</h2><p className="mt-1 text-sm text-brand-ink/60">{loan.memberName} · {loan.status}</p></div><button type="button" aria-label="Close" onClick={onClose} className="text-2xl">×</button></div><dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">{[["Principal", `₦${loan.principalAmount.toLocaleString()}`], ["Total repaid", `₦${loan.totalRepaid.toLocaleString()}`], ["Outstanding", `₦${loan.outstandingBalance.toLocaleString()}`], ["Approval date", loan.approvalDate], ["Tenor", loan.tenorMonths ? `${loan.tenorMonths} months` : "Not specified"], ["Disbursed", loan.disbursedAtUtc ? new Date(loan.disbursedAtUtc).toLocaleString() : "No"], ["Remarks", loan.remarks || "—"]].map(([label, value]) => <div key={label} className="rounded-xl bg-brand-line/10 p-3"><dt className="text-xs text-brand-ink/55">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>)}</dl>{role !== "member" && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={documentLoading} onClick={() => void openDocument()} className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-brand-cream disabled:opacity-60">{documentLoading ? "Preparing document…" : "View / download signed form"}</button>{documentError && <p role="alert" className="text-sm text-status-bad">{documentError}</p>}</div>}</section></div>;
}


