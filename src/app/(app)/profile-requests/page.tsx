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
import {
  listPendingProfileUpdateRequests,
  approveProfileUpdateRequest,
  rejectProfileUpdateRequest,
  type ProfileUpdateRequestData,
} from "@/lib/api/profile-update-requests";

/**
 * GET /api/v1/admin/profile-update-requests and .../approve|reject —
 * Admin only (AbkWestCoop.Api's AdminProfileUpdateRequestsController;
 * anyone else hitting this page gets a 403 from the API itself). A
 * Member proposes an email/phone change from My Records
 * (see (app)/records/page.tsx) since they have no direct edit
 * endpoint; this queue is where that proposal is accepted or turned
 * down.
 */
const PAGE_SIZE = 20;

export default function ProfileRequestsPage() {
  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<ProfileUpdateRequestData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPendingProfileUpdateRequests(pageNumber, PAGE_SIZE)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setError(response.message || "Profile update requests could not be loaded.");
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
            ? err.message || "Profile update requests could not be loaded."
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

  async function handleReview(request: ProfileUpdateRequestData, approve: boolean) {
    setActingId(request.id);
    setError(null);
    setNotice(null);
    try {
      const response = approve
        ? await approveProfileUpdateRequest(request.id)
        : await rejectProfileUpdateRequest(request.id);
      if (!response.success) {
        setError(response.message || "This request could not be reviewed.");
        return;
      }
      setNotice(
        `Request for user ${request.userId} ${approve ? "approved" : "rejected"}.`
      );
      setItems((current) => current.filter((item) => item.id !== request.id));
      setTotalCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message || "This request could not be reviewed." : "Could not reach the server."
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-ink">Profile Update Requests</h1>
        <p className="mt-1 text-sm text-brand-ink/60">
          {totalCount > 0
            ? `${totalCount} pending request${totalCount === 1 ? "" : "s"}.`
            : "Pending member profile change requests."}
        </p>
      </div>

      {notice && <p className="text-sm text-brand-green">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          Loading requests…
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No pending profile update requests.
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>User ID</TableHeaderCell>
              <TableHeaderCell>Proposed email</TableHeaderCell>
              <TableHeaderCell>Proposed phone</TableHeaderCell>
              <TableHeaderCell>Requested</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-xs">{request.userId}</TableCell>
                <TableCell>{request.proposedEmail || "—"}</TableCell>
                <TableCell>{request.proposedPhoneNumber || "—"}</TableCell>
                <TableCell>{new Date(request.requestedAtUtc).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => handleReview(request, true)}
                      disabled={actingId === request.id}
                    >
                      {actingId === request.id ? "…" : "Approve"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleReview(request, false)}
                      disabled={actingId === request.id}
                    >
                      Reject
                    </Button>
                  </div>
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
