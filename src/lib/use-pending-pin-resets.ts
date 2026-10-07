"use client";

import { useEffect, useState } from "react";
import { listPendingPinResets } from "@/lib/api/pin-reset";
import { isSuperadmin, type Role } from "@/lib/roles";

/** Same-tab signal the PIN Reset Requests page fires after an approval,
 * so the sidebar badge and dashboard tile drop immediately instead of
 * waiting for the next poll. */
export const PIN_RESETS_CHANGED_EVENT = "onward-pin-resets-changed";

/** The largest page worth scanning to count pending requests
 * client-side for a superadmin (matches MAX_PAGE_SIZE used the same way
 * in (app)/members/page.tsx). */
const SCAN_SIZE = 100;
const POLL_MS = 60_000;

/**
 * Pending PIN-reset request count for the signed-in officer.
 *
 * "Based on association" per the PRD: a Supervisor/President's count is
 * already scoped to their own society by the backend, so the endpoint's
 * totalCount is used as-is. A Developer/Onward Superadmin has no
 * per-society filter on that endpoint, so this scans one page of pending
 * requests and counts only those matching the society the sidebar
 * switcher points at — never a cross-society total.
 *
 * `enabled` must be false for roles that can't act on the queue (the
 * endpoint would 403). Returns count=null until the first answer.
 */
export function usePendingPinResetCount(
  role: Role,
  societyId: string,
  enabled: boolean
): { count: number | null; error: string | null } {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCount(null);
      return;
    }
    const superadmin = isSuperadmin(role);
    if (superadmin && !societyId) {
      setCount(null);
      return;
    }

    let cancelled = false;
    function load() {
      listPendingPinResets(1, superadmin ? SCAN_SIZE : 1)
        .then((response) => {
          if (cancelled) return;
          if (!response.success || !response.data) {
            setError(response.message || "Pending PIN reset count could not be loaded.");
            return;
          }
          setError(null);
          setCount(
            superadmin
              ? response.data.items.filter((item) => item.societyId === societyId).length
              : response.data.totalCount
          );
        })
        .catch(() => {
          if (!cancelled) setError("Pending PIN reset count could not be loaded.");
        });
    }

    load();
    const timer = window.setInterval(load, POLL_MS);
    window.addEventListener(PIN_RESETS_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(PIN_RESETS_CHANGED_EVENT, load);
    };
  }, [role, societyId, enabled]);

  return { count, error };
}
