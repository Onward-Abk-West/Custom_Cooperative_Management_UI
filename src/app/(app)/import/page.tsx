"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  assignSocietyCode,
  getSociety,
  SOCIETY_CODE_PATTERN,
  type SocietySummary,
} from "@/lib/api/societies";
import {
  downloadMemberImportErrors,
  importMembers,
  MEMBER_IMPORT_WORKBOOK_SPEC,
  type MemberImportResultData,
} from "@/lib/api/member-import";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";

/**
 * Developer-Superadmin-only, one-time onboarding for a NEW society: give
 * it a code, then (optionally) load its existing member roster and
 * opening balances from a workbook. Afterwards members and financial
 * records are entered by hand from Members / Financial Records.
 * Which society is targeted comes from the sidebar switcher
 * (useSociety()), the same convention as /assign-roles.
 *
 * The two steps are a true sequence, not decoration: the backend refuses
 * an import for a society with no code (409 SOCIETY_CODE_REQUIRED), and a
 * code can be assigned only once.
 *
 * A bad row never fails the whole workbook — it is rejected on its own,
 * so the result is always a summary plus a rejected-rows table (and a
 * downloadable spreadsheet of them), never just a pass/fail toast.
 */
export default function ImportPage() {
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
        <h1 className="font-heading text-2xl font-bold text-heading">Import</h1>
        <p className="mt-1 max-w-3xl text-sm text-brand-ink/60">
          One-time setup for a new society: assign its code, then load its existing members and
          opening balances from a spreadsheet. After this, members and their records are added
          manually.
        </p>
      </div>

      {!isDeveloperSuperadmin ? (
        <Notice>Only a Developer Superadmin can import members.</Notice>
      ) : !societyId ? (
        <Notice>Choose a society from the sidebar switcher first.</Notice>
      ) : (
        <SocietySetup societyId={societyId} />
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
      {children}
    </div>
  );
}

/** The API's own message is already specific for most failures; these
 * codes get clearer, next-step wording. */
function describeError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) {
    return "Could not reach the server. Please check your connection and try again.";
  }
  const code =
    typeof err.body === "object" && err.body !== null
      ? (err.body as { code?: unknown }).code
      : undefined;
  switch (code) {
    case "SOCIETY_CODE_REQUIRED":
      return "This society has no code yet. Assign it in step 1, then import.";
    case "MEMBER_IMPORT_ALREADY_COMPLETED":
      return "This exact workbook has already been imported for this society. If you corrected rejected rows, upload a new workbook containing only those rows.";
    case "SOCIETY_CODE_ALREADY_ASSIGNED":
      return "This society already has a code, and it cannot be changed.";
    case "SOCIETY_CODE_ALREADY_EXISTS":
      return "Another society already uses this code. Choose a different one.";
    case "MEMBER_IMPORT_ERROR_DETAILS_UNAVAILABLE":
      return "This import rejected rows before detailed error reports existed, so no spreadsheet is available for it.";
    default:
      return err.message || fallback;
  }
}

function SocietySetup({ societyId }: { societyId: string }) {
  const [society, setSociety] = useState<SocietySummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSociety(null);
    getSociety(societyId)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setLoadError(response.message || "The society could not be loaded.");
          return;
        }
        setSociety(response.data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describeError(err, "The society could not be loaded."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId]);

  const handleCodeAssigned = useCallback((code: string) => {
    setSociety((current) => (current ? { ...current, code } : current));
  }, []);

  if (loading) {
    return <Notice>Loading society…</Notice>;
  }
  if (loadError || !society) {
    return (
      <p role="alert" className="text-sm font-semibold text-status-bad">
        {loadError || "The society could not be loaded."}
      </p>
    );
  }

  const hasCode = Boolean(society.code);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-brand-ink/70">
        Setting up <span className="font-semibold text-heading">{society.name}</span>
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <CodeStep society={society} onAssigned={handleCodeAssigned} />
        <ImportStep societyId={societyId} hasCode={hasCode} />
      </div>
    </div>
  );
}

function StepHeading({ step, title, done }: { step: number; title: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-status-good text-white"
            : "bg-brand-line/60 text-heading"
        }`}
      >
        {done ? "✓" : step}
      </span>
      <h2 className="font-heading text-lg font-bold text-heading">
        <span className="sr-only">Step {step}: </span>
        {title}
      </h2>
    </div>
  );
}

function CodeStep({
  society,
  onAssigned,
}: {
  society: SocietySummary;
  onAssigned: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAssigned, setJustAssigned] = useState(false);

  // Switching society must not carry a half-typed code to the next one.
  useEffect(() => {
    setCode("");
    setConfirmed(false);
    setError(null);
    setJustAssigned(false);
  }, [society.id]);

  const assigned = society.code ?? null;
  const valid = SOCIETY_CODE_PATTERN.test(code);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError("Use 2 to 10 letters or digits, with no spaces or symbols.");
      return;
    }
    if (!confirmed) {
      setError("Confirm that you understand the code cannot be changed.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await assignSocietyCode(society.id, code);
      if (!response.success || !response.data) {
        setError(response.message || "The code could not be assigned.");
        return;
      }
      setJustAssigned(true);
      onAssigned(response.data.code);
    } catch (err) {
      setError(describeError(err, "The code could not be assigned."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-line bg-surface-card p-5">
      <StepHeading step={1} title="Society code" done={Boolean(assigned)} />

      {assigned ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="inline-flex w-fit items-center rounded-full border border-brand-line bg-brand-line/25 px-4 py-2 font-mono text-base font-bold tracking-wider text-heading">
            {assigned}
          </p>
          <p role={justAssigned ? "status" : undefined} className="text-sm text-brand-ink/70">
            {justAssigned ? "Code assigned. " : ""}
            Membership numbers for this society start with this code, and it cannot be changed.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-brand-ink/60">
            A short prefix for this society&apos;s membership numbers. Members cannot be imported
            until it is set.
          </p>
          <Input
            id="society-code"
            label="Code (2–10 letters or digits)"
            value={code}
            maxLength={10}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. ABW"
            onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
            className="font-mono uppercase tracking-wider"
          />
          <label className="flex items-start gap-3 text-sm text-brand-ink/80">
            <input
              id="society-code-confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-green"
            />
            <span>I understand the code can be set only once and cannot be changed afterwards.</span>
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-status-bad">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting || !valid || !confirmed} className="self-start">
            {submitting ? "Assigning…" : "Assign code"}
          </Button>
        </form>
      )}
    </section>
  );
}

function ImportStep({ societyId, hasCode }: { societyId: string; hasCode: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [transactionDate, setTransactionDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MemberImportResultData | null>(null);

  // A result (and any error) belongs to one upload into one society.
  useEffect(() => {
    setResult(null);
    setError(null);
    setFile(null);
    setFileInputKey((k) => k + 1);
  }, [societyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose the .xlsx workbook to import.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("The workbook must be an .xlsx file.");
      return;
    }
    if (!transactionDate) {
      setError("Choose the date these opening balances are dated as of.");
      return;
    }
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const response = await importMembers(societyId, file, transactionDate);
      if (!response.success || !response.data) {
        setError(response.message || "The import could not be completed.");
        return;
      }
      setResult(response.data);
    } catch (err) {
      setError(describeError(err, "The import could not be completed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        className={`rounded-2xl border border-brand-line bg-surface-card p-5 ${
          hasCode ? "" : "opacity-70"
        }`}
      >
        <StepHeading step={2} title="Import members" done={Boolean(result)} />
        <p className="mt-2 text-sm text-brand-ink/60">
          Each row becomes one member with one financial record per non-zero balance. Rows with a
          problem are rejected on their own and listed afterwards; the rest are still imported.
          The same workbook can be imported successfully only once per society.
        </p>

        {!hasCode && (
          <p className="mt-3 rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-brand-ink">
            Assign the society code in step 1 to unlock this step.
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="import-file" className="mb-1 block text-sm font-semibold text-heading">
              Workbook (.xlsx)
            </label>
            <input
              key={fileInputKey}
              id="import-file"
              name="file"
              type="file"
              accept=".xlsx"
              disabled={!hasCode || submitting}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-full border border-brand-line bg-brand-line/25 px-5 py-3 text-sm text-brand-ink outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand-green file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-cream focus:border-brand-gold focus:bg-brand-cream focus:ring-2 focus:ring-brand-gold/30 disabled:opacity-60"
            />
          </div>

          <Input
            id="import-transaction-date"
            name="transactionDate"
            type="date"
            label="Opening-balance date"
            required
            disabled={!hasCode || submitting}
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />

          {error && (
            <p role="alert" className="whitespace-pre-line text-sm font-semibold text-status-bad">
              {error}
            </p>
          )}

          <Button type="submit" disabled={!hasCode || submitting} className="self-start">
            {submitting ? "Importing…" : "Import members"}
          </Button>
        </form>

        <WorkbookRequirements />
      </section>

      {result && <ImportResult societyId={societyId} result={result} />}
    </div>
  );
}

function WorkbookRequirements() {
  const spec = MEMBER_IMPORT_WORKBOOK_SPEC;
  return (
    <details className="mt-5 rounded-xl border border-brand-line bg-brand-line/10 px-4 py-3 text-sm text-brand-ink/80">
      <summary className="cursor-pointer font-semibold text-heading">Workbook requirements</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p>
          The file must contain exactly one worksheet named <strong>{spec.sheetName}</strong>, with
          column headers on row {spec.headerRow} and member data from row {spec.firstDataRow}.
          There must be exactly {spec.columnCount} columns, each header appearing once.
        </p>
        <div>
          <p className="font-semibold text-heading">Identity columns</p>
          <p className="mt-1 font-mono text-xs">{spec.identityColumns.join("  ·  ")}</p>
        </div>
        <div>
          <p className="font-semibold text-heading">Balance columns (all required)</p>
          <p className="mt-1 font-mono text-xs leading-relaxed">
            {spec.financialColumns.join("  ·  ")}
          </p>
          <p className="mt-1 text-xs text-brand-ink/60">&ldquo;HOUSE HOLD&rdquo; is accepted for Household.</p>
        </div>
      </div>
    </details>
  );
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ImportResult({
  societyId,
  result,
}: {
  societyId: string;
  result: MemberImportResultData;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloadError(null);
    setDownloading(true);
    try {
      const file = await downloadMemberImportErrors(societyId, result.importId);
      if (!file) {
        setDownloadError("This import has no rejected rows to report.");
        return;
      }
      saveBlob(file.blob, file.fileName ?? `member-import-errors-${result.importId.slice(0, 8)}.xlsx`);
    } catch (err) {
      setDownloadError(describeError(err, "The error report could not be downloaded."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section aria-live="polite" className="rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-heading">Import summary</h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <SummaryStat label="Total rows" value={result.totalRows} />
        <SummaryStat label="Imported" value={result.importedRows} />
        <SummaryStat label="Rejected" value={result.rejectedRows} tone={result.rejectedRows > 0 ? "bad" : undefined} />
        <SummaryStat label="Members created" value={result.membersCreated} />
        <SummaryStat label="Financial records" value={result.financialRecordsCreated} />
      </dl>

      {result.rejectedRows === 0 ? (
        <p className="mt-5 text-sm text-brand-ink/70">
          Every row was imported. From here, add members and their records manually from Members
          and Financial Records.
        </p>
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-heading">
              Rejected rows ({result.rowErrors.length})
            </h3>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={downloading}
              className="py-2"
            >
              {downloading ? "Preparing…" : "Download error report (.xlsx)"}
            </Button>
          </div>
          {downloadError && (
            <p role="alert" className="mt-2 text-sm font-semibold text-status-bad">
              {downloadError}
            </p>
          )}
          <p className="mt-2 text-sm text-brand-ink/60">
            To fix these, put only the corrected rows in a new workbook and import that. A
            membership number that already exists is rejected, so resubmitting the whole file would
            list the rows that already went in.
          </p>
          <div className="mt-3">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Row</TableHeaderCell>
                  <TableHeaderCell>S/N</TableHeaderCell>
                  <TableHeaderCell>Reasons</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.rowErrors.map((rowError) => (
                  <TableRow key={rowError.rowNumber}>
                    <TableCell className="tabular-nums">{rowError.rowNumber}</TableCell>
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
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "bad";
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-heading">{label}</dt>
      <dd
        className={`mt-1 text-2xl font-bold tabular-nums ${
          tone === "bad" ? "text-status-bad" : "text-brand-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
