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
import { ApiError } from "@/lib/api-client";
import {
  listAuditLogs,
  listOnwardAuditLogs,
  type AuditLogEntryData,
  type OnwardAuditLogEntryData,
} from "@/lib/api/audit-logs";
import { listSocieties, type SocietySummary } from "@/lib/api/societies";
import { readSessionInfo } from "@/lib/session";
import { getMockSession } from "@/lib/mock-session";

const PAGE_SIZE = 25;

/** Backend ActorRole strings this log can ever contain — "Developer
 * Superadmin" is deliberately absent: every Developer Superadmin event
 * is IsDeveloperPrivate and never appears here (see AuditService.cs and
 * OnwardAuditLogReader.cs on the backend). */
const ROLE_FILTER_OPTIONS = ["Onward Superadmin", "Supervisor", "President", "Admin", "Member"];

/**
 * Role-aware: a Developer Superadmin sees their own private trail,
 * filterable by society/date (below), via
 * GET /api/v1/developer-superadmin/audit-logs, while an Onward Superadmin
 * sees the separate, filterable, umbrella-wide log (society / role / date,
 * all by name — never a raw id) via GET /api/v1/onward-superadmin/audit-logs.
 * There is no role filter on the Developer Superadmin's own log — every
 * row there already has ActorRole "Developer Superadmin". See roles.ts's
 * NAV_ITEMS for why both roles reach this same route.
 */
export default function AuditLogPage() {
  const [role, setRole] = useState<"developer_superadmin" | "onward_superadmin" | null>(null);

  useEffect(() => {
    const session = readSessionInfo();
    const resolved = session?.role ?? getMockSession().role;
    setRole(resolved === "onward_superadmin" ? "onward_superadmin" : "developer_superadmin");
  }, []);

  if (role === null) {
    return <p className="text-sm text-brand-ink/60">Loading…</p>;
  }

  return role === "onward_superadmin" ? <OnwardAuditLogView /> : <DeveloperAuditLogView />;
}

function DeveloperAuditLogView() {
  const [societies, setSocieties] = useState<SocietySummary[]>([]);
  const [societyId, setSocietyId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<AuditLogEntryData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSocieties(1, 100)
      .then((response) => {
        if (response.success && response.data) {
          setSocieties(response.data.items);
        }
      })
      .catch(() => {
        // The filter bar still works society-blind if this fails.
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAuditLogs(
      {
        societyId: societyId || undefined,
        fromUtc: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
        toUtc: toDate ? `${toDate}T23:59:59.999Z` : undefined,
      },
      pageNumber,
      PAGE_SIZE
    )
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setError(response.message || "The audit log could not be loaded.");
          return;
        }
        setItems(response.data.items);
        setTotalPages(response.data.totalPages);
        setTotalCount(response.data.totalCount);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message || "The audit log could not be loaded."
            : "Could not reach the server. Please check your connection and try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId, fromDate, toDate, pageNumber]);

  const selectClassName =
    "w-full rounded-full border border-brand-line bg-brand-line/25 px-5 py-3 text-sm text-brand-ink outline-none focus:border-brand-gold focus:bg-brand-cream focus:ring-2 focus:ring-brand-gold/30";

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPageNumber(1);
      setter(value);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-heading">Audit Log</h1>
        <p className="mt-1 text-sm text-brand-ink/60">
          Your own actions as Developer Superadmin — private to you.{" "}
          {totalCount > 0 && `${totalCount} recorded event${totalCount === 1 ? "" : "s"}.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-brand-line bg-surface-card p-4">
        <div className="min-w-[180px] flex-1">
          <label htmlFor="dev-audit-filter-society" className="mb-1 block text-sm font-semibold text-heading">
            Society
          </label>
          <select
            id="dev-audit-filter-society"
            value={societyId}
            onChange={(e) => resetToFirstPage(setSocietyId)(e.target.value)}
            className={selectClassName}
          >
            <option value="">All societies</option>
            {societies.map((society) => (
              <option key={society.id} value={society.id}>
                {society.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px] flex-1">
          <label htmlFor="dev-audit-filter-from" className="mb-1 block text-sm font-semibold text-heading">
            From
          </label>
          <input
            id="dev-audit-filter-from"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => resetToFirstPage(setFromDate)(e.target.value)}
            className={selectClassName}
          />
        </div>
        <div className="min-w-[150px] flex-1">
          <label htmlFor="dev-audit-filter-to" className="mb-1 block text-sm font-semibold text-heading">
            To
          </label>
          <input
            id="dev-audit-filter-to"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => resetToFirstPage(setToDate)(e.target.value)}
            className={selectClassName}
          />
        </div>
        {(societyId || fromDate || toDate) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setPageNumber(1);
                setSocietyId("");
                setFromDate("");
                setToDate("");
              }}
              className="rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink/70 transition hover:bg-brand-line/25"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading audit log…
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No audit events match these filters.
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Occurred</TableHeaderCell>
              <TableHeaderCell>Actor</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Entity</TableHeaderCell>
              <TableHeaderCell>Society</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(entry.occurredAtUtc).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{entry.actorName || "Unknown"}</span>
                    <span className="text-xs text-brand-ink/50">{entry.actorRole}</span>
                  </div>
                </TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{entry.affectedEntityName || entry.affectedEntityType}</span>
                    {entry.affectedEntityName && (
                      <span className="text-xs text-brand-ink/50">{entry.affectedEntityType}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{entry.societyName || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <PaginationBar pageNumber={pageNumber} totalPages={totalPages} onChange={setPageNumber} />
      )}
    </div>
  );
}

function OnwardAuditLogView() {
  const [societies, setSocieties] = useState<SocietySummary[]>([]);
  const [societyId, setSocietyId] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<OnwardAuditLogEntryData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSocieties(1, 100)
      .then((response) => {
        if (response.success && response.data) {
          setSocieties(response.data.items);
        }
      })
      .catch(() => {
        // The filter bar still works society-blind if this fails.
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listOnwardAuditLogs(
      {
        societyId: societyId || undefined,
        role: actorRole || undefined,
        fromUtc: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
        toUtc: toDate ? `${toDate}T23:59:59.999Z` : undefined,
      },
      pageNumber,
      PAGE_SIZE
    )
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setError(response.message || "The audit log could not be loaded.");
          return;
        }
        setItems(response.data.items);
        setTotalPages(response.data.totalPages);
        setTotalCount(response.data.totalCount);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message || "The audit log could not be loaded."
            : "Could not reach the server. Please check your connection and try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId, actorRole, fromDate, toDate, pageNumber]);

  const selectClassName =
    "w-full rounded-full border border-brand-line bg-brand-line/25 px-5 py-3 text-sm text-brand-ink outline-none focus:border-brand-gold focus:bg-brand-cream focus:ring-2 focus:ring-brand-gold/30";

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPageNumber(1);
      setter(value);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-heading">Audit Log</h1>
        <p className="mt-1 text-sm text-brand-ink/60">
          Activity across every society.{" "}
          {totalCount > 0 && `${totalCount} recorded event${totalCount === 1 ? "" : "s"}.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-brand-line bg-surface-card p-4">
        <div className="min-w-[180px] flex-1">
          <label htmlFor="audit-filter-society" className="mb-1 block text-sm font-semibold text-heading">
            Society
          </label>
          <select
            id="audit-filter-society"
            value={societyId}
            onChange={(e) => resetToFirstPage(setSocietyId)(e.target.value)}
            className={selectClassName}
          >
            <option value="">All societies</option>
            {societies.map((society) => (
              <option key={society.id} value={society.id}>
                {society.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px] flex-1">
          <label htmlFor="audit-filter-role" className="mb-1 block text-sm font-semibold text-heading">
            Role
          </label>
          <select
            id="audit-filter-role"
            value={actorRole}
            onChange={(e) => resetToFirstPage(setActorRole)(e.target.value)}
            className={selectClassName}
          >
            <option value="">All roles</option>
            {ROLE_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px] flex-1">
          <label htmlFor="audit-filter-from" className="mb-1 block text-sm font-semibold text-heading">
            From
          </label>
          <input
            id="audit-filter-from"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => resetToFirstPage(setFromDate)(e.target.value)}
            className={selectClassName}
          />
        </div>
        <div className="min-w-[150px] flex-1">
          <label htmlFor="audit-filter-to" className="mb-1 block text-sm font-semibold text-heading">
            To
          </label>
          <input
            id="audit-filter-to"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => resetToFirstPage(setToDate)(e.target.value)}
            className={selectClassName}
          />
        </div>
        {(societyId || actorRole || fromDate || toDate) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setPageNumber(1);
                setSocietyId("");
                setActorRole("");
                setFromDate("");
                setToDate("");
              }}
              className="rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink/70 transition hover:bg-brand-line/25"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading audit log…
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No audit events match these filters.
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Occurred</TableHeaderCell>
              <TableHeaderCell>Actor</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Entity</TableHeaderCell>
              <TableHeaderCell>Society</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(entry.occurredAtUtc).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{entry.actorName || "Unknown"}</span>
                    <span className="text-xs text-brand-ink/50">{entry.actorRole}</span>
                  </div>
                </TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{entry.affectedEntityName || entry.affectedEntityType}</span>
                    {entry.affectedEntityName && (
                      <span className="text-xs text-brand-ink/50">{entry.affectedEntityType}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{entry.societyName || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <PaginationBar pageNumber={pageNumber} totalPages={totalPages} onChange={setPageNumber} />
      )}
    </div>
  );
}

function PaginationBar({
  pageNumber,
  totalPages,
  onChange,
}: {
  pageNumber: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-brand-ink/60">
      <button
        type="button"
        disabled={pageNumber <= 1}
        onClick={() => onChange(Math.max(1, pageNumber - 1))}
        className="rounded-full border border-brand-line px-3 py-1.5 font-medium transition hover:bg-brand-line/25 disabled:opacity-40"
      >
        Previous
      </button>
      <span>
        Page {pageNumber} of {totalPages}
      </span>
      <button
        type="button"
        disabled={pageNumber >= totalPages}
        onClick={() => onChange(Math.min(totalPages, pageNumber + 1))}
        className="rounded-full border border-brand-line px-3 py-1.5 font-medium transition hover:bg-brand-line/25 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
