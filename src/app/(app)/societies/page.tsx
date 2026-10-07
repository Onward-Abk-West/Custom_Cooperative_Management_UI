"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { listSocieties, type SocietySummary } from "@/lib/api/societies";

/**
 * GET /api/v1/societies — Developer Superadmin and Onward Superadmin
 * only per AbkWestCoop.Api's SocietiesController; a Supervisor/
 * President/Admin/Member hitting this page gets a 403 from the API
 * itself (shown inline below), since there's no client-side role gate
 * duplicating that authorization check here.
 */
const PAGE_SIZE = 20;

export default function SocietiesPage() {
  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<SocietySummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSocieties(pageNumber, PAGE_SIZE)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setError(response.message || "Societies could not be loaded.");
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
            ? err.message || "Societies could not be loaded."
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-heading">
            Societies
          </h1>
          <p className="mt-1 text-sm text-brand-ink/60">
            {totalCount > 0
              ? `${totalCount} society${totalCount === 1 ? "" : "ies"} across the umbrella.`
              : "Societies under this umbrella."}
          </p>
        </div>
        <Link href="/societies/new">
          <Button type="button">New society</Button>
        </Link>
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading societies…
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No societies yet.{" "}
          <Link href="/societies/new" className="font-medium text-brand-gold-dark hover:underline">
            Create the first one
          </Link>
          .
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Society ID</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((society) => (
              <TableRow key={society.id}>
                <TableCell className="font-medium">{society.name}</TableCell>
                <TableCell className="font-mono text-xs text-brand-ink/50">
                  {society.id}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/societies/${society.id}`}
                    className="text-sm font-medium text-brand-gold-dark hover:underline"
                  >
                    View
                  </Link>
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
