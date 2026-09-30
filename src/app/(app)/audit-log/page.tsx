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
import { listAuditLogs, type AuditLogEntryData } from "@/lib/api/audit-logs";

/**
 * GET /api/v1/developer-superadmin/audit-logs — Developer Superadmin
 * only (AbkWestCoop.Api's DeveloperSuperadminAuditLogsController).
 * Not Onward Superadmin, despite this nav item's own doc comment in
 * roles.ts musing about a "shared" audit log — the backend restricts
 * this specific endpoint to Developer Superadmin alone, so that's what
 * this page (and its nav entry) are gated to.
 */
const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<AuditLogEntryData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAuditLogs(pageNumber, PAGE_SIZE)
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
  }, [pageNumber]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-ink">Audit Log</h1>
        <p className="mt-1 text-sm text-brand-ink/60">
          {totalCount > 0 ? `${totalCount} recorded event${totalCount === 1 ? "" : "s"}.` : "System-wide activity."}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading audit log…
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No audit events recorded yet.
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
                    <span className="font-medium">{entry.actorRole}</span>
                    <span className="font-mono text-xs text-brand-ink/50">{entry.actorUserId}</span>
                  </div>
                </TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{entry.affectedEntityType}</span>
                    <span className="font-mono text-xs text-brand-ink/50">{entry.affectedEntityId}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-brand-ink/50">
                  {entry.societyId || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-brand-ink/60">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
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
            onClick={() => setPageNumber((n) => Math.min(totalPages, n + 1))}
            className="rounded-full border border-brand-line px-3 py-1.5 font-medium transition hover:bg-brand-line/25 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
