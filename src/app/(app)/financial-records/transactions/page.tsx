"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { FINANCIAL_CATEGORIES, listFinancialTransactions, type FinancialTransactionFilters, type FinancialTransactionListItem } from "@/lib/api/financial-transactions";
import { Money } from "@/components/money/MoneyPopup";
import { Pagination } from "@/components/ui/Pagination";
import { usePageSize } from "@/lib/use-page-size";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";
import { isSuperadmin, type Role } from "@/lib/roles";

const DEFAULT_PAGE_SIZE = 25;

export default function FinancialTransactionsPage() {
  const { societyId: selectedSocietyId } = useSociety();
  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = usePageSize(DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<FinancialTransactionListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FinancialTransactionListItem | null>(null);
  const [filters, setFilters] = useState<FinancialTransactionFilters>({});
  const [draft, setDraft] = useState<FinancialTransactionFilters>({});
  const societyId = role && isSuperadmin(role) ? selectedSocietyId : ownSocietyId;

  useEffect(() => {
    const session = readSessionInfo();
    setRole(session?.role ?? null);
    setOwnSocietyId(session?.societyId ?? "");
  }, []);

  useEffect(() => {
    if (!role || !societyId) { setRows([]); setTotalCount(0); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listFinancialTransactions(role, societyId, filters, pageNumber, pageSize)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) throw new Error(response.message || "Financial transactions could not be loaded.");
        setRows(response.data.items);
        setTotalCount(response.data.totalCount);
        setTotalPages(response.data.totalPages);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Financial transactions could not be loaded.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role, societyId, filters, pageNumber, pageSize]);

  const heading = useMemo(() => {
    if (!rows.length) return "Financial Transactions";
    const dates = new Set(rows.map((row) => row.transactionDate.slice(0, 7)));
    if (dates.size !== 1) return "Financial Transactions";
    return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${rows[0].transactionDate.slice(0, 7)}-01T00:00:00Z`)).toUpperCase();
  }, [rows]);

  if (!role) return <p className="text-sm text-brand-ink/60">Loading…</p>;
  if (!(isSuperadmin(role) || ["admin", "supervisor", "president"].includes(role)))
    return <p className="text-sm text-brand-ink/60">Financial transaction access is not available for your role.</p>;
  if (!societyId) return <p className="rounded-xl border border-dashed border-brand-line p-5 text-sm text-brand-ink/60">{isSuperadmin(role) ? "Choose a society from the sidebar switcher first." : "Your society could not be determined from your session."}</p>;

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setFilters({ ...draft });
    setPageNumber(1);
  }

  return <div className="flex min-w-0 flex-col gap-5">
    <header>
      <h1 className="font-heading text-2xl font-bold text-heading">{heading}</h1>
      <p className="mt-1 text-sm text-brand-ink/60">Transactions for the selected society · {totalCount.toLocaleString()} total</p>
    </header>

    <form onSubmit={applyFilters} className="grid min-w-0 grid-cols-1 gap-3 rounded-2xl bg-surface-card p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-semibold text-heading">Search member, membership no. or reference<input value={draft.search ?? ""} onChange={(e) => setDraft((v) => ({ ...v, search: e.target.value }))} maxLength={100} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2 text-sm font-normal text-brand-ink" /></label>
      <label className="text-xs font-semibold text-heading">Category<select value={draft.category ?? ""} onChange={(e) => setDraft((v) => ({ ...v, category: e.target.value as FinancialTransactionFilters["category"] }))} className="mt-1 w-full rounded-xl border border-brand-line bg-surface-card px-3 py-2 text-sm font-normal text-brand-ink"><option value="">All categories</option>{FINANCIAL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
      <label className="text-xs font-semibold text-heading">From date<input type="date" value={draft.startDate ?? ""} onChange={(e) => setDraft((v) => ({ ...v, startDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2 text-sm font-normal text-brand-ink" /></label>
      <label className="text-xs font-semibold text-heading">To date<input type="date" value={draft.endDate ?? ""} onChange={(e) => setDraft((v) => ({ ...v, endDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2 text-sm font-normal text-brand-ink" /></label>
      <label className="text-xs font-semibold text-heading">Minimum amount<input type="number" min="0" step="0.01" value={draft.minimumAmount ?? ""} onChange={(e) => setDraft((v) => ({ ...v, minimumAmount: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2 text-sm font-normal text-brand-ink" /></label>
      <label className="text-xs font-semibold text-heading">Maximum amount<input type="number" min="0" step="0.01" value={draft.maximumAmount ?? ""} onChange={(e) => setDraft((v) => ({ ...v, maximumAmount: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2 text-sm font-normal text-brand-ink" /></label>
      <div className="flex items-end gap-2"><button className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={loading}>Apply filters</button><button type="button" onClick={() => { setDraft({}); setFilters({}); setPageNumber(1); }} className="rounded-full border border-brand-line px-4 py-2 text-sm">Clear</button></div>
    </form>

    {error && <p role="alert" className="rounded-xl bg-status-bad/10 p-3 text-sm text-status-bad">{error}</p>}
    {loading ? <div className="animate-pulse rounded-2xl bg-surface-card p-8 text-sm text-brand-ink/60">Loading transactions…</div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-brand-line p-8 text-center text-sm text-brand-ink/60">No financial transactions match these filters.</div> :
      <Table borderless className="min-w-[850px]"><TableHead className="border-b border-brand-line/70 bg-transparent"><TableRow><TableHeaderCell>Date</TableHeaderCell><TableHeaderCell>Transaction ID</TableHeaderCell><TableHeaderCell>Member</TableHeaderCell><TableHeaderCell>Category</TableHeaderCell><TableHeaderCell>Reference</TableHeaderCell><TableHeaderCell className="text-right">Amount</TableHeaderCell><TableHeaderCell>Action</TableHeaderCell></TableRow></TableHead><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="whitespace-nowrap">{new Date(`${row.transactionDate}T00:00:00Z`).toLocaleDateString()}</TableCell><TableCell className="font-mono text-xs">{row.id.slice(0, 8).toUpperCase()}</TableCell><TableCell><span className="font-medium">{row.memberName}</span>{row.membershipNumber && <span className="block text-xs text-brand-ink/50">{row.membershipNumber}</span>}</TableCell><TableCell>{row.category}</TableCell><TableCell>{row.referenceNumber ?? "—"}</TableCell><TableCell className="text-right font-semibold tabular-nums"><Money value={row.amount}/></TableCell><TableCell><button type="button" onClick={() => setSelected(row)} className="font-semibold text-brand-green-deep hover:underline">Details</button></TableCell></TableRow>)}</TableBody></Table>}
    <Pagination pageNumber={pageNumber} pageSize={pageSize} totalCount={totalCount} totalPages={totalPages} onPageChange={setPageNumber} onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }} />

    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="presentation" onClick={() => setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><h2 id="transaction-detail-title" className="font-heading text-xl font-bold">Transaction details</h2><button type="button" aria-label="Close" onClick={() => setSelected(null)} className="rounded-full px-2 py-1 text-xl">×</button></div><dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">{[["Member", selected.memberName], ["Membership no.", selected.membershipNumber ?? "N/A"], ["Category", selected.category], ["Amount", `₦${selected.amount.toLocaleString()}`], ["Transaction date", selected.transactionDate], ["Payment method", selected.paymentMethod ?? "N/A"], ["Reference", selected.referenceNumber ?? "N/A"], ["Recorded", new Date(selected.createdAtUtc).toLocaleString()], ["Record version", String(selected.version)]].map(([label, value]) => <div key={label} className="rounded-xl bg-brand-line/10 p-3"><dt className="text-xs text-brand-ink/55">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>)}</dl></section></div>}
  </div>;
}
