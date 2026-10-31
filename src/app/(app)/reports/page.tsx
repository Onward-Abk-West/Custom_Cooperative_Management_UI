"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { FINANCIAL_CATEGORIES } from "@/lib/api/financial-transactions";
import { downloadReport, readReport, type ReportData, type ReportQuery, type ReportType } from "@/lib/api/reports";
import { isSuperadmin, type Role } from "@/lib/roles";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";
import { usePageSize } from "@/lib/use-page-size";
import { showError, showSuccess } from "@/lib/feedback";

const TYPES: Array<{ value: ReportType; label: string }> = [
  { value: "Transactions", label: "Transaction report" },
  { value: "Loans", label: "Loan disbursement report" },
  { value: "Savings", label: "Savings report" },
  { value: "Membership", label: "Membership report" },
  { value: "MonthlyActivity", label: "Monthly activity report" },
];
const ACTIVITY_SECTIONS = ["Transactions", "Total transaction value", "Savings received", "Loans disbursed", "Total disbursed", "Loan repayments", "New members"];
const PAGE_SIZE = 25;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { societyId: selectedSociety } = useSociety();
  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState("");
  const societyId = role && isSuperadmin(role) ? selectedSociety : ownSocietyId;
  const [draft, setDraft] = useState({ type: "Transactions" as ReportType, startDate: "", endDate: "", category: "", includeDetails: true });
  const [sections, setSections] = useState<string[]>(ACTIVITY_SECTIONS);
  const [active, setActive] = useState<Omit<ReportQuery, "pageNumber" | "pageSize"> | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = usePageSize(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const info = readSessionInfo(); setRole(info?.role ?? null); setOwnSocietyId(info?.societyId ?? "");
  }, []);

  useEffect(() => {
    if (!role || !societyId || !active) { setReport(null); return; }
    let cancelled = false; setLoading(true); setError(null);
    readReport(role, societyId, { ...active, pageNumber, pageSize })
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) throw new Error(response.message || "The report could not be generated.");
        setReport(response.data);
      })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : "The report could not be generated."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role, societyId, active, pageNumber, pageSize]);

  const canView = role && (isSuperadmin(role) || ["admin", "supervisor", "president"].includes(role));
  const query = useMemo(() => active ? { ...active, pageNumber, pageSize } : null, [active, pageNumber, pageSize]);

  if (!role) return <p className="text-sm text-brand-ink/60">Loading…</p>;
  if (!canView) return <p className="text-sm text-brand-ink/60">Reports are not available for your role.</p>;
  if (!societyId) return <p className="rounded-2xl border border-dashed border-brand-line p-6 text-sm text-brand-ink/60">Choose a society from the sidebar to prepare its report.</p>;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) { setError("The start date must be before the end date."); return; }
    setPageNumber(1); setActive({ ...draft, category: ["Transactions", "Savings"].includes(draft.type) ? draft.category : "", sections: draft.type === "MonthlyActivity" ? sections : [] });
  }

  async function exportFile(format: "excel" | "pdf") {
    if (!query || !role) return;
    setExporting(format); setError(null);
    try {
      const file = await downloadReport(role, societyId, query, format);
      if (!file) throw new Error("The report export could not be downloaded.");
      saveBlob(file.blob, file.fileName ?? `society-report.${format === "excel" ? "xlsx" : "pdf"}`);
      await showSuccess("Report ready", `The ${format === "excel" ? "Excel" : "PDF"} report was downloaded.`);
    } catch (err) { await showError("Export failed", err instanceof Error ? err.message : "The report export failed."); }
    finally { setExporting(null); }
  }

  return <main className="flex min-w-0 flex-col gap-5">
    <header><h1 className="font-heading text-2xl font-bold text-heading">Reports</h1><p className="mt-1 text-sm text-brand-ink/60">Generate society scoped reports from stored transactions, loans, and member records.</p></header>
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 rounded-2xl bg-surface-card p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-semibold">Report type<select value={draft.type} onChange={(e) => setDraft((v) => ({ ...v, type: e.target.value as ReportType }))} className="mt-1 w-full rounded-xl border border-brand-line bg-surface-card px-3 py-2.5 text-sm font-normal">{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label className="text-sm font-semibold">From<input type="date" value={draft.startDate} onChange={(e) => setDraft((v) => ({ ...v, startDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label>
      <label className="text-sm font-semibold">To<input type="date" value={draft.endDate} onChange={(e) => setDraft((v) => ({ ...v, endDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-transparent px-3 py-2.5 text-sm font-normal" /></label>
      {["Transactions", "Savings"].includes(draft.type) && <label className="text-sm font-semibold">Category<select value={draft.category} onChange={(e) => setDraft((v) => ({ ...v, category: e.target.value }))} className="mt-1 w-full rounded-xl border border-brand-line bg-surface-card px-3 py-2.5 text-sm font-normal"><option value="">All categories</option>{FINANCIAL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.includeDetails} onChange={(e) => setDraft((v) => ({ ...v, includeDetails: e.target.checked }))} className="accent-brand-green" />Include report detail rows</label>
      {draft.type === "MonthlyActivity" && <fieldset className="sm:col-span-2 xl:col-span-4"><legend className="text-sm font-semibold">Monthly activity sections</legend><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{ACTIVITY_SECTIONS.map((section) => <label key={section} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sections.includes(section)} onChange={(e) => setSections((current) => e.target.checked ? [...current, section] : current.filter((x) => x !== section))} className="accent-brand-green" />{section}</label>)}</div></fieldset>}
      <div className="flex items-end"><button disabled={loading} className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-brand-cream disabled:opacity-50">{loading ? "Generating…" : "Generate report"}</button></div>
    </form>

    {error && <p role="alert" className="rounded-xl bg-status-bad/10 p-3 text-sm text-status-bad">{error}</p>}
    {report && <section className="flex min-w-0 flex-col gap-4 rounded-2xl bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-heading text-xl font-bold text-heading">{TYPES.find((item) => item.value === report.type)?.label}</h2><p className="mt-1 text-sm text-brand-ink/60">{report.societyName} · {report.startDate ?? "All time"}{report.endDate ? ` to ${report.endDate}` : ""}</p><p className="text-xs text-brand-ink/50">Generated {new Date(report.generatedAtUtc).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={exporting !== null} onClick={() => void exportFile("excel")} className="rounded-full border border-brand-line px-4 py-2 text-sm font-semibold disabled:opacity-50">{exporting === "excel" ? "Preparing Excel…" : "Download Excel"}</button><button type="button" disabled={exporting !== null} onClick={() => void exportFile("pdf")} className="rounded-full border border-brand-line px-4 py-2 text-sm font-semibold disabled:opacity-50">{exporting === "pdf" ? "Preparing PDF…" : "Download PDF"}</button></div></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{report.summary.map((metric) => <div key={metric.label} className="rounded-xl bg-brand-line/10 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/55">{metric.label}</p><p className="mt-2 text-xl font-bold text-heading">{metric.amount !== null ? `₦${metric.amount.toLocaleString()}` : metric.count !== null ? metric.count.toLocaleString() : metric.value ?? "N/A"}</p></div>)}</div>
      {report.categoryBreakdown.length > 0 && <div><h3 className="font-semibold text-heading">Category breakdown</h3><div className="mt-2 flex flex-wrap gap-2">{report.categoryBreakdown.map((metric) => <span key={metric.label} className="rounded-full bg-brand-green/10 px-3 py-1.5 text-xs font-medium">{metric.label}: ₦{metric.amount?.toLocaleString() ?? "0"} · {metric.count ?? 0}</span>)}</div></div>}
      {draft.includeDetails && <><div className="overflow-x-auto rounded-xl"><Table borderless className="min-w-[700px]"><TableHead className="border-b border-brand-line/70 bg-transparent"><TableRow>{report.table.columns.map((column) => <TableHeaderCell key={column}>{column}</TableHeaderCell>)}</TableRow></TableHead><TableBody>{report.table.rows.length === 0 ? <TableRow><TableCell colSpan={Math.max(1, report.table.columns.length)} className="py-8 text-center text-brand-ink/55">No records in this reporting period.</TableCell></TableRow> : report.table.rows.map((cells, index) => <TableRow key={index}>{report.table.columns.map((column, cell) => <TableCell key={column} className="max-w-xs break-words">{cells[cell] ?? "—"}</TableCell>)}</TableRow>)}</TableBody></Table></div><Pagination pageNumber={report.pageNumber} pageSize={report.pageSize} totalCount={report.totalCount} totalPages={report.totalPages} onPageChange={setPageNumber} onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }} /></>}
    </section>}
  </main>;
}
