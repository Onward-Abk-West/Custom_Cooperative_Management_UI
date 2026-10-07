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
import { ApiError } from "@/lib/api-client";
import { PIN_RESETS_CHANGED_EVENT } from "@/lib/use-pending-pin-resets";
import {
  listPendingPinResets,
  approvePinReset,
  type PinResetRequestData,
} from "@/lib/api/pin-reset";

/**
 * GET /api/v1/pin-reset-requests and POST .../{id}/approve — Supervisor,
 * President, Developer Superadmin, Onward Superadmin (see
 * AbkWestCoop.Api's PinResetRequestsController; a Member or Admin
 * hitting this page gets a 403 from the API, since there's no
 * client-side role gate duplicating that check here). Approving mints
 * a one-time reset credential the backend never shows again — this
 * page keeps approved credentials in local state only, for exactly as
 * long as the officer is looking at this page, so they can hand each
 * one to the right member before navigating away.
 */
const PAGE_SIZE = 20;

interface ApprovedCredential {
  requestId: string;
  userId: string;
  resetCredential: string;
  expiresAtUtc: string;
}

export default function PinResetsPage() {
  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<PinResetRequestData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approved, setApproved] = useState<ApprovedCredential[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPendingPinResets(pageNumber, PAGE_SIZE)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setError(response.message || "PIN reset requests could not be loaded.");
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
            ? err.message || "PIN reset requests could not be loaded."
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

  async function handleApprove(request: PinResetRequestData) {
    setApprovingId(request.id);
    setError(null);
    try {
      const response = await approvePinReset(request.id);
      if (!response.success || !response.data) {
        setError(response.message || "This request could not be approved.");
        return;
      }
      setApproved((current) => [
        {
          requestId: request.id,
          userId: request.userId,
          resetCredential: response.data!.resetCredential,
          expiresAtUtc: response.data!.expiresAtUtc,
        },
        ...current,
      ]);
      setItems((current) => current.filter((item) => item.id !== request.id));
      setTotalCount((count) => Math.max(0, count - 1));
      // Tell the sidebar badge / dashboard tile to re-count right away.
      window.dispatchEvent(new Event(PIN_RESETS_CHANGED_EVENT));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || "This request could not be approved." : "Could not reach the server."
      );
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-heading">PIN Reset Requests</h1>
        <p className="mt-1 text-sm text-brand-ink/60">
          {totalCount > 0
            ? `${totalCount} pending request${totalCount === 1 ? "" : "s"}.`
            : "Pending PIN reset requests."}
        </p>
      </div>

      {approved.length > 0 && (
        <div className="flex flex-col gap-3">
          {approved.map((credential) => (
            <div
              key={credential.requestId}
              className="rounded-2xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm"
            >
              <p className="font-semibold text-brand-ink">
                Approved — hand this credential to the member (User ID:{" "}
                <span className="font-mono text-xs">{credential.userId}</span>).
              </p>
              <p className="mt-1 text-brand-ink/70">
                Reset credential (expires {new Date(credential.expiresAtUtc).toLocaleString()}):
              </p>
              <p className="mt-1 select-all break-all rounded-lg bg-brand-cream px-3 py-2 font-mono text-xs text-brand-ink">
                {credential.resetCredential}
              </p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-status-bad">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading requests…
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No pending PIN reset requests.
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>User ID</TableHeaderCell>
              <TableHeaderCell>Society ID</TableHeaderCell>
              <TableHeaderCell>Requested</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-xs">{request.userId}</TableCell>
                <TableCell className="font-mono text-xs text-brand-ink/50">{request.societyId}</TableCell>
                <TableCell>{new Date(request.requestedAtUtc).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    onClick={() => handleApprove(request)}
                    disabled={approvingId === request.id}
                  >
                    {approvingId === request.id ? "Approving…" : "Approve"}
                  </Button>
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
