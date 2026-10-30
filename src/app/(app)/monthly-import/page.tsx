"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  completeMonthlyFinancialPeriod,
  confirmMonthlyFinancialImport,
  downloadMonthlyFinancialTemplate,
  executeMonthlyFinancialImport,
  previewMonthlyFinancialImport,
  reopenMonthlyFinancialPeriod,
  type MonthlyImportExecutionData,
  type MonthlyImportPreviewData,
} from "@/lib/api/financial-transactions";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";
import { isSuperadmin, type Role } from "@/lib/roles";

function saveDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function messageFor(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  const body = error.body;
  if (typeof body === "object" && body !== null && "code" in body) {
    const code = String((body as { code: unknown }).code);
    const messages: Record<string, string> = {
      IMPORT_PERIOD_OVERLAP: "These dates overlap a period that is already reserved. Choose another date range.",
      DUPLICATE_UPLOAD: "This exact workbook has already been submitted.",
      INVALID_WORKBOOK: "The workbook could not be read. Download the template and check its headers and cell values.",
      IMPORT_LIMIT_EXCEEDED: "The workbook exceeds the allowed import size or row limit.",
      IMPORT_CONFIRMATION_REJECTED: "Confirmation failed. The preview may have expired; start with a new workbook.",
      DUPLICATE_REFERENCE: "A reference number is already used. Correct the workbook and start a new import.",
      CONCURRENT_CHANGE: "A member or transaction changed after validation. Start a new import with an updated workbook.",
      INVALID_PREVIEW: "The import confirmation expired or is no longer valid. Start a new import.",
    };
    return messages[code] ?? error.message ?? fallback;
  }
  return error.message || fallback;
}

function isInvalidKind(kind: MonthlyImportPreviewData["items"][number]["kind"]) {
  return kind === "Invalid" || kind === 4;
}

function kindLabel(kind: MonthlyImportPreviewData["items"][number]["kind"]) {
  return typeof kind === "number"
    ? (["New", "Update", "Unchanged", "Potential duplicate", "Invalid"][kind] ?? "Unknown")
    : kind;
}

export default function MonthlyImportPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState("");
  const { societyId: selectedSocietyId } = useSociety();
  const societyId = role === "admin" ? ownSocietyId : selectedSocietyId;
  const [file, setFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preview, setPreview] = useState<MonthlyImportPreviewData | null>(null);
  const [result, setResult] = useState<MonthlyImportExecutionData | null>(null);
  const [periodCompleted, setPeriodCompleted] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [busy, setBusy] = useState<"template" | "preview" | "import" | "period" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const info = readSessionInfo();
    setRole(info?.role ?? null);
    setOwnSocietyId(info?.societyId ?? "");
  }, []);

  useEffect(() => {
    setPreview(null); setResult(null); setPeriodCompleted(false); setError(null); setNotice(null);
  }, [societyId]);

  async function downloadTemplate() {
    if (!societyId) return;
    setBusy("template"); setError(null);
    try {
      const downloaded = await downloadMonthlyFinancialTemplate(societyId);
      if (downloaded) saveDownload(downloaded.blob, downloaded.fileName ?? "monthly-financial-import-template.xlsx");
    } catch (err) { setError(messageFor(err, "Could not download the template.")); }
    finally { setBusy(null); }
  }

  async function handlePreview(event: React.FormEvent) {
    event.preventDefault(); setError(null); setNotice(null); setPreview(null); setResult(null);
    if (!file) { setError("Choose an .xlsx workbook."); return; }
    if (!startDate || !endDate || endDate < startDate) { setError("Choose a valid date range."); return; }
    setBusy("preview");
    try {
      const response = await previewMonthlyFinancialImport(societyId, file, startDate, endDate);
      setPreview(response);
      if (response.previewId) {
        setNotice("Workbook validated. This date range is now reserved while you confirm and import.");
      } else if (response.items.some((item) => item.kind === "Invalid")) {
        setError("The workbook has invalid rows. Fix the listed rows and submit a corrected workbook.");
      } else {
        setError("The workbook could not be prepared for import.");
      }
    } catch (err) { setError(messageFor(err, "Could not validate this workbook.")); }
    finally { setBusy(null); }
  }

  async function confirmAndImport() {
    if (!preview?.previewId || !preview.periodId || !preview.confirmationToken) return;
    setBusy("import"); setError(null); setNotice(null);
    try {
      await confirmMonthlyFinancialImport(societyId, preview.previewId, preview.confirmationToken);
      const imported = await executeMonthlyFinancialImport(societyId, preview.previewId, preview.confirmationToken);
      if (!imported.success) throw new Error(imported.code || "Import was not completed.");
      setResult(imported);
      setNotice("Import completed successfully.");
    } catch (err) { setError(messageFor(err, err instanceof Error ? err.message : "Could not complete this import.")); }
    finally { setBusy(null); }
  }

  async function completePeriod() {
    if (!preview?.periodId) return;
    setBusy("period"); setError(null);
    try {
      await completeMonthlyFinancialPeriod(societyId, preview.periodId);
      setPeriodCompleted(true); setNotice("The import period is complete.");
    } catch (err) { setError(messageFor(err, "Could not complete this period.")); }
    finally { setBusy(null); }
  }

  async function reopenPeriod(event: React.FormEvent) {
    event.preventDefault();
    if (!preview?.periodId || !reopenReason.trim()) { setError("Enter a reason for reopening this period."); return; }
    setBusy("period"); setError(null);
    try {
      await reopenMonthlyFinancialPeriod(societyId, preview.periodId, reopenReason.trim());
      setPeriodCompleted(false); setReopenReason(""); setNotice("The period has been reopened.");
    } catch (err) { setError(messageFor(err, "Could not reopen this period.")); }
    finally { setBusy(null); }
  }

  if (!role) return <p className="text-sm text-brand-ink/60">Loading…</p>;
  if (!isSuperadmin(role) && role !== "admin") {
    return <p className="text-sm text-brand-ink/60">Monthly financial imports are not available for your role.</p>;
  }
  if (!societyId) {
    return <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
      {isSuperadmin(role) ? "Choose a society from the sidebar switcher to import its monthly transactions." : "Your society could not be determined from your session. Try signing in again."}
    </div>;
  }

  const invalidRows = preview?.items.filter((item) => isInvalidKind(item.kind)) ?? [];
  const canImport = !!preview?.previewId && !!preview.confirmationToken && invalidRows.length === 0 && !result;
  const periodReserved = !!preview?.previewId;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-heading">Monthly financial import</h1>
        <p className="mt-1 max-w-3xl text-sm text-brand-ink/60">Import monthly transactions by membership number. Validate the workbook, review every row, then confirm the import.</p>
      </header>

      <section className="max-w-3xl rounded-2xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm text-brand-ink">
        <p className="font-semibold">Date ranges are reserved after a successful validation.</p>
        <p className="mt-1">The backend has no cancel action for a validated import. Upload only when the workbook is ready to confirm and import. A preview expires after 15 minutes.</p>
        <Button type="button" variant="outline" className="mt-3" disabled={busy !== null} onClick={downloadTemplate}>
          {busy === "template" ? "Downloading…" : "Download workbook template"}
        </Button>
      </section>

      <form onSubmit={handlePreview} className="max-w-3xl rounded-2xl border border-brand-line bg-surface-card p-5">
        <h2 className="font-heading text-lg font-bold text-heading">Validate a monthly workbook</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input id="monthly-start" label="Period start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required disabled={periodReserved} />
          <Input id="monthly-end" label="Period end date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required disabled={periodReserved} />
        </div>
        <div className="mt-3">
          <label htmlFor="monthly-workbook" className="mb-1 block text-sm font-semibold text-heading">Workbook (.xlsx)</label>
          <input id="monthly-workbook" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={periodReserved} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setResult(null); }} className="block w-full rounded-xl border border-brand-line bg-brand-line/20 p-3 text-sm text-brand-ink file:mr-3 file:rounded-full file:border-0 file:bg-brand-green file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60" />
          <p className="mt-1 text-xs text-brand-ink/60">Required columns: Membership Number, Category, Amount, Transaction Date. Reference Number and Payment Method are optional.</p>
        </div>
        <Button type="submit" className="mt-4" disabled={busy !== null || !file || periodReserved}>{busy === "preview" ? "Validating…" : periodReserved ? "Period reserved" : "Validate workbook"}</Button>
      </form>

      {notice && <p role="status" className="max-w-3xl rounded-xl bg-brand-green/10 p-3 text-sm font-medium text-brand-green">{notice}</p>}
      {error && <p role="alert" className="max-w-3xl rounded-xl bg-status-bad/10 p-3 text-sm font-semibold text-status-bad">{error}</p>}

      {preview && <section className="max-w-5xl rounded-2xl border border-brand-line bg-surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-heading">Workbook review</h2>
            <p className="mt-1 text-sm text-brand-ink/60">{preview.items.length} row(s) · {invalidRows.length} invalid row(s)</p>
          </div>
          {canImport && <Button type="button" disabled={busy !== null} onClick={confirmAndImport}>{busy === "import" ? "Importing…" : "Confirm and import"}</Button>}
        </div>
        {preview.expiresAtUtc && <p className="mt-2 text-xs text-brand-ink/60">Confirmation expires {new Date(preview.expiresAtUtc).toLocaleString()}.</p>}
        {preview.items.length > 0 ? <div className="mt-4 overflow-x-auto rounded-xl border border-brand-line">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-brand-line/25 text-xs uppercase text-brand-ink/70"><tr>
              <th className="p-3">Row</th><th className="p-3">Membership no.</th><th className="p-3">Category</th><th className="p-3">Amount</th><th className="p-3">Date</th><th className="p-3">Reference</th><th className="p-3">Payment</th><th className="p-3">Status / detail</th>
            </tr></thead>
            <tbody>{preview.items.map((item) => <tr key={`${item.rowNumber}-${item.membershipNumber}`} className="border-t border-brand-line align-top">
              <td className="p-3">{item.rowNumber}</td><td className="p-3">{item.membershipNumber || "—"}</td><td className="p-3">{item.category || "—"}</td>
              <td className="p-3">{Number.isFinite(item.amount) ? `₦${item.amount.toLocaleString()}` : "—"}</td><td className="p-3">{item.transactionDate || "—"}</td><td className="p-3">{item.referenceNumber || "—"}</td><td className="p-3">{item.paymentMethod || "—"}</td>
              <td className={`p-3 ${isInvalidKind(item.kind) ? "font-semibold text-status-bad" : "text-brand-ink"}`}>{kindLabel(item.kind)}{item.warnings?.length ? `: ${item.warnings.join("; ")}` : ""}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="mt-4 text-sm text-brand-ink/60">No data rows were found in the workbook.</p>}
        {invalidRows.length > 0 && <p className="mt-3 text-sm font-semibold text-status-bad">Correct the workbook and validate it again. Invalid workbooks do not reserve the period.</p>}
        {result && <div className="mt-4 rounded-xl bg-brand-green/10 p-4 text-sm text-brand-ink">
          <p className="font-semibold">Import result</p><p className="mt-1">{result.created} created · {result.updated} updated · {result.skipped} skipped.</p>
          {!periodCompleted && <Button type="button" className="mt-3" disabled={busy !== null} onClick={completePeriod}>{busy === "period" ? "Saving…" : "Complete this period"}</Button>}
          {periodCompleted && <form onSubmit={reopenPeriod} className="mt-3 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1"><Input id="reopen-reason" label="Reason to reopen period" value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} maxLength={500} required /></div>
            <Button type="submit" variant="outline" disabled={busy !== null || !reopenReason.trim()}>{busy === "period" ? "Saving…" : "Reopen period"}</Button>
          </form>}
          {periodCompleted && <Button type="button" variant="ghost" className="mt-3" onClick={() => { setPreview(null); setResult(null); setPeriodCompleted(false); setFile(null); setStartDate(""); setEndDate(""); setNotice(null); }}>Start another import</Button>}
        </div>}
      </section>}
    </div>
  );
}
