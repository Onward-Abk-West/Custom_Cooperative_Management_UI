"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { importDgtWorkbook, type DgtImportResultData } from "@/lib/api/dgt-import";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";

/**
 * Developer-Superadmin-only, one-time-per-society migration tool: hands
 * the legacy "DGT" XLSX workbook (member roster + opening financial
 * balances, from before this system existed) to
 * DeveloperSuperadminDgtImportsController. Which society is targeted
 * comes from the sidebar switcher (useSociety()) — same convention as
 * /assign-roles — since this role has no society of its own.
 *
 * The backend accepts partial success: a bad row is rejected
 * individually rather than failing the whole workbook, so the result
 * is always a summary (counts) plus a rowErrors table when any rows
 * were rejected — never just a pass/fail toast.
 */
export default function DgtImportPage() {
  const { societyId } = useSociety();
  const [isDeveloperSuperadmin, setIsDeveloperSuperadmin] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDeveloperSuperadmin(readSessionInfo()?.role === "developer_superadmin");
  }, []);

  if (isDeveloperSuperadmin === null) {
    return <p className="text-sm text-brand-ink/60">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-heading">DGT Import</h1>
        <p className="mt-1 text-sm text-brand-ink/60">
          Imports a legacy DGT member roster and opening financial balances into the society
          currently selected in the sidebar switcher. Each row becomes one member and one
          financial record per non-zero balance column; rows with a problem are rejected
          individually and listed below rather than failing the whole import.
        </p>
      </div>

      {!isDeveloperSuperadmin ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Only a Developer Superadmin can run a DGT import.
        </div>
      ) : !societyId ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Choose a society from the sidebar switcher first.
        </div>
      ) : (
        <DgtImportForm societyId={societyId} />
      )}
    </div>
  );
}

function DgtImportForm({ societyId }: { societyId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [transactionDate, setTransactionDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DgtImportResultData | null>(null);

  // A result (and any error) is specific to one upload — switching
  // societies mid-session shouldn't leave a previous society's import
  // summary on screen looking current.
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [societyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose the DGT .xlsx workbook to import.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("The workbook must be an .xlsx file.");
      return;
    }
    if (!transactionDate) {
      setError("Choose the transaction date these opening balances are dated as of.");
      return;
    }
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const response = await importDgtWorkbook(societyId, file, transactionDate);
      if (!response.success || !response.data) {
        setError(response.message || "The import could not be completed.");
        return;
      }
      setResult(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "The import could not be completed."
          : "Could not reach the server. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="max-w-lg rounded-2xl border border-brand-line bg-surface-card p-5">
        <h2 className="font-heading text-lg font-bold text-heading">Import workbook</h2>
        <p className="mt-1 text-sm text-brand-ink/60">
          The same workbook can only be imported successfully once per society — a repeat upload
          is rejected rather than creating duplicate members.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="dgt-file" className="mb-1 block text-sm font-semibold text-heading">
              DGT workbook (.xlsx)
            </label>
            <input
              id="dgt-file"
              name="file"
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-full border border-brand-line bg-brand-line/25 px-5 py-3 text-sm text-brand-ink outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand-green file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-cream focus:border-brand-gold focus:bg-brand-cream focus:ring-2 focus:ring-brand-gold/30"
            />
          </div>

          <Input
            id="dgt-transaction-date"
            name="transactionDate"
            type="date"
            label="Transaction date"
            required
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm font-semibold text-status-bad">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2 self-start">
            {submitting ? "Importing…" : "Import"}
          </Button>
        </form>
      </section>

      {result && (
        <section className="rounded-2xl border border-brand-line bg-surface-card p-5">
          <h2 className="font-heading text-lg font-bold text-heading">Import summary</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <SummaryStat label="Total rows" value={result.totalRows} />
            <SummaryStat label="Imported" value={result.importedRows} />
            <SummaryStat label="Rejected" value={result.rejectedRows} />
            <SummaryStat label="Members created" value={result.membersCreated} />
            <SummaryStat label="Financial records" value={result.financialRecordsCreated} />
          </dl>

          {result.rowErrors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-heading">
                Rejected rows ({result.rowErrors.length})
              </h3>
              <div className="mt-2">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Row</TableHeaderCell>
                      <TableHeaderCell>Serial no.</TableHeaderCell>
                      <TableHeaderCell>Reasons</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.rowErrors.map((rowError) => (
                      <TableRow key={rowError.rowNumber}>
                        <TableCell>{rowError.rowNumber}</TableCell>
                        <TableCell>{rowError.serialNumber || "—"}</TableCell>
                        <TableCell>
                          <ul className="list-inside list-disc">
                            {rowError.reasons.map((reason, i) => (
                              <li key={i}>{reason}</li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-heading">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-brand-ink">{value}</dd>
    </div>
  );
}
