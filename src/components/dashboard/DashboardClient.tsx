"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatCard } from "./StatCard";
import { LineChart } from "./LineChart";
import { BarChart } from "./BarChart";
import { StackedBar } from "./StackedBar";
import { ChartCard } from "./ChartCard";
import { FiltersBar, type DashboardFilters, type DateRangeKey } from "./FiltersBar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import {
  ALL_ENTRIES,
  MEMBER_COUNTS,
  MEMBER_COUNTS_PREV,
  MONTHS,
  OPENING_LOAN_BALANCE,
  RECENT_ACTIVITY,
  SOCIETIES,
  TRANSACTION_TYPES,
  formatNaira,
  type TransactionType,
} from "@/lib/dashboard-data";
import { listPendingPinResets } from "@/lib/api/pin-reset";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";
import { isSuperadmin, type Role } from "@/lib/roles";

/** The largest page worth scanning to count pending requests client-side
 * for a superadmin — see PendingPinResetsCard below. Matches the
 * MAX_PAGE_SIZE ceiling used the same way in (app)/members/page.tsx. */
const PIN_RESET_SCAN_SIZE = 100;

/**
 * A small, dismiss-free alert tile: how many PIN reset requests are
 * waiting for the signed-in officer to approve. Only rendered for the
 * four roles that can actually act on the queue (matches PIN Reset
 * Requests' NAV_ITEMS roles in src/lib/roles.ts).
 *
 * "Based on association" per the PRD: a Supervisor/President's count is
 * already scoped to their own society by the backend (same
 * GET /api/v1/pin-reset-requests a Supervisor/President ever sees), so
 * their total page count is used as-is. A Developer/Onward Superadmin
 * has no per-society filter on that endpoint yet, so this scans a page
 * of pending requests and counts only the ones matching whichever
 * society the sidebar switcher currently points at — never a
 * cross-society total — and re-counts whenever that selection changes.
 */
function PendingPinResetsCard({ role, societyId }: { role: Role; societyId: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    if (isSuperadmin(role)) {
      if (!societyId) {
        setCount(null);
        return;
      }
      listPendingPinResets(1, PIN_RESET_SCAN_SIZE)
        .then((response) => {
          if (cancelled) return;
          if (!response.success || !response.data) {
            setError(response.message || "Pending PIN reset count could not be loaded.");
            return;
          }
          setCount(response.data.items.filter((item) => item.societyId === societyId).length);
        })
        .catch(() => {
          if (!cancelled) setError("Pending PIN reset count could not be loaded.");
        });
    } else {
      listPendingPinResets(1, 1)
        .then((response) => {
          if (cancelled) return;
          if (!response.success || !response.data) {
            setError(response.message || "Pending PIN reset count could not be loaded.");
            return;
          }
          setCount(response.data.totalCount);
        })
        .catch(() => {
          if (!cancelled) setError("Pending PIN reset count could not be loaded.");
        });
    }

    return () => {
      cancelled = true;
    };
  }, [role, societyId]);

  if (count === null && !error) {
    return null;
  }

  return (
    <Link
      href="/pin-resets"
      className="flex items-center justify-between gap-3 rounded-2xl border border-brand-line bg-surface-card p-4 transition hover:border-brand-gold"
    >
      <div>
        <p className="text-sm font-semibold text-brand-ink">Pending PIN reset requests</p>
        <p className="mt-0.5 text-xs text-brand-ink/60">
          {isSuperadmin(role) ? "For the society selected in the sidebar switcher." : "For your society."}
        </p>
      </div>
      {error ? (
        <span className="text-xs font-semibold text-status-bad">{error}</span>
      ) : (
        <span
          className={`inline-flex min-w-9 items-center justify-center rounded-full px-3 py-1.5 text-sm font-bold ${
            count && count > 0 ? "bg-status-bad text-white" : "bg-brand-line/30 text-brand-ink/60"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

const RANGE_INDICES: Record<DateRangeKey, number[]> = {
  "6m": [0, 1, 2, 3, 4, 5],
  "3m": [3, 4, 5],
  "1m": [5],
};

function monthlySeries(type: TransactionType, societyId: string): number[] {
  return MONTHS.map((month) =>
    ALL_ENTRIES.filter(
      (e) =>
        e.type === type &&
        e.month === month &&
        (societyId === "all" || e.societyId === societyId)
    ).reduce((sum, e) => sum + e.amount, 0)
  );
}

function sumAt(values: number[], indices: number[]): number {
  return indices.reduce((sum, i) => sum + values[i], 0);
}

/** Running total at each index, without a mutable accumulator — each
 * entry is its own pure reduction over the slice up to it. */
function cumulative(values: number[]): number[] {
  return values.map((_, i) =>
    values.slice(0, i + 1).reduce((sum, v) => sum + v, 0)
  );
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function DashboardClient() {
  const [filters, setFilters] = useState<DashboardFilters>({
    societyId: "all",
    range: "6m",
    type: "all",
  });

  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState("");
  const { societyId: switchedSocietyId } = useSociety();

  useEffect(() => {
    const info = readSessionInfo();
    setRole(info?.role ?? null);
    setOwnSocietyId(info?.societyId ?? "");
  }, []);

  const canHandlePinResets =
    role === "supervisor" ||
    role === "president" ||
    role === "developer_superadmin" ||
    role === "onward_superadmin";

  const rangeIdx = RANGE_INDICES[filters.range];
  const lastIdx = MONTHS.length - 1;

  const {
    savingsMonthly,
    repaymentMonthly,
    totalSavings,
    totalSavingsDelta,
    outstandingSeries,
    outstandingValue,
    outstandingDelta,
    repaymentRateSeries,
    repaymentRateValue,
    repaymentRateDelta,
    totalMembers,
    totalMembersDelta,
  } = useMemo(() => {
    const savings = monthlySeries("Savings deposit", filters.societyId);
    const repayment = monthlySeries("Loan repayment", filters.societyId);
    const disbursement = monthlySeries("Loan disbursement", filters.societyId);

    const savingsInRange = sumAt(savings, rangeIdx);
    const savingsPrevMonth = savings[lastIdx - 1] ?? savings[lastIdx];

    // Net outstanding balance is cumulative (disbursed minus repaid to
    // date) on top of the book's opening balance, not something that
    // resets per filter range — a "last 3 months" view still shows
    // the whole book's current balance.
    const opening =
      filters.societyId === "all"
        ? Object.values(OPENING_LOAN_BALANCE).reduce((a, b) => a + b, 0)
        : OPENING_LOAN_BALANCE[filters.societyId];
    const net = disbursement.map((d, i) => d - repayment[i]);
    const outstanding = cumulative(net).map((v) => v + opening);

    const rate = disbursement.map((d, i) => (d === 0 ? 0 : (repayment[i] / d) * 100));

    const members =
      filters.societyId === "all"
        ? Object.values(MEMBER_COUNTS).reduce((a, b) => a + b, 0)
        : MEMBER_COUNTS[filters.societyId];
    const membersPrev =
      filters.societyId === "all"
        ? Object.values(MEMBER_COUNTS_PREV).reduce((a, b) => a + b, 0)
        : MEMBER_COUNTS_PREV[filters.societyId];

    return {
      savingsMonthly: savings,
      repaymentMonthly: repayment,
      totalSavings: savingsInRange,
      totalSavingsDelta: pctDelta(savings[lastIdx], savingsPrevMonth),
      outstandingSeries: outstanding,
      outstandingValue: outstanding[lastIdx],
      outstandingDelta: pctDelta(outstanding[lastIdx], outstanding[lastIdx - 1]),
      repaymentRateSeries: rate,
      repaymentRateValue: sumAt(repayment, rangeIdx) / (sumAt(disbursement, rangeIdx) || 1) * 100,
      repaymentRateDelta: rate[lastIdx] - rate[lastIdx - 1],
      totalMembers: members,
      totalMembersDelta: pctDelta(members, membersPrev),
    };
  }, [filters.societyId, rangeIdx, lastIdx]);

  const barData = useMemo(
    () =>
      SOCIETIES.map((s) => ({
        label: s.name,
        value: sumAt(monthlySeries("Savings deposit", s.id), rangeIdx),
      })),
    [rangeIdx]
  );

  const mixSegments = useMemo(() => {
    const colors: Record<TransactionType, string> = {
      "Savings deposit": "var(--chart-1)",
      "Loan repayment": "var(--chart-2)",
      "Loan disbursement": "var(--chart-3)",
    };
    return TRANSACTION_TYPES.map((type) => ({
      key: type,
      label: type,
      value: sumAt(monthlySeries(type, filters.societyId), rangeIdx),
      color: colors[type],
    }));
  }, [filters.societyId, rangeIdx]);

  const activityRows = RECENT_ACTIVITY.filter(
    (row) =>
      (filters.societyId === "all" || row.societyId === filters.societyId) &&
      (filters.type === "all" || row.type === filters.type)
  );
  const societyName = (id: string) =>
    SOCIETIES.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold text-brand-ink">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-brand-ink/60">
          Figures below are sample data — the financial-records backend
          hasn&apos;t been built yet (Dashboards &amp; Export phase). The
          filters are fully wired to this sample set so the layout can be
          reviewed against real interaction, not just a static mock.
        </p>
      </div>

      {canHandlePinResets && role && (
        <PendingPinResetsCard
          role={role}
          societyId={isSuperadmin(role) ? switchedSocietyId : ownSocietyId}
        />
      )}

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        societies={SOCIETIES}
        types={TRANSACTION_TYPES}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total savings"
          value={formatNaira(totalSavings)}
          delta={formatPct(totalSavingsDelta)}
          trend={savingsMonthly}
          accent="var(--chart-1)"
        />
        <StatCard
          label="Loans outstanding"
          value={formatNaira(outstandingValue)}
          delta={formatPct(outstandingDelta)}
          trend={outstandingSeries}
          accent="var(--chart-3)"
        />
        <StatCard
          label="Total members"
          value={totalMembers.toLocaleString()}
          delta={formatPct(totalMembersDelta)}
          trend={[
            MEMBER_COUNTS_PREV[filters.societyId] ??
              Object.values(MEMBER_COUNTS_PREV).reduce((a, b) => a + b, 0),
            totalMembers,
          ]}
          accent="var(--chart-4)"
        />
        <StatCard
          label="Repayment rate"
          value={`${repaymentRateValue.toFixed(0)}%`}
          delta={`${repaymentRateDelta >= 0 ? "+" : ""}${repaymentRateDelta.toFixed(1)}pp`}
          trend={repaymentRateSeries}
          accent="var(--chart-2)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard
            title="Savings deposits & loan repayments"
            caption={`Monthly totals, ${filters.societyId === "all" ? "all societies" : societyName(filters.societyId)}`}
            table={{
              headers: ["Month", "Savings deposits", "Loan repayments"],
              rows: MONTHS.map((m, i) => [
                m,
                formatNaira(savingsMonthly[i]),
                formatNaira(repaymentMonthly[i]),
              ]),
            }}
          >
            <LineChart
              categories={[...MONTHS]}
              series={[
                {
                  key: "savings",
                  label: "Savings deposits",
                  color: "var(--chart-1)",
                  values: savingsMonthly,
                },
                {
                  key: "repayments",
                  label: "Loan repayments",
                  color: "var(--chart-2)",
                  values: repaymentMonthly,
                },
              ]}
              valueFormatter={formatNaira}
            />
          </ChartCard>
        </div>

        <ChartCard
          title="Transaction mix"
          caption="Share of total value, by type"
          table={{
            headers: ["Type", "Value", "Share"],
            rows: mixSegments.map((s) => {
              const total = mixSegments.reduce((a, b) => a + b.value, 0) || 1;
              return [s.label, formatNaira(s.value), `${Math.round((s.value / total) * 100)}%`];
            }),
          }}
        >
          <StackedBar
            segments={mixSegments}
            valueFormatter={formatNaira}
            highlightKey={filters.type === "all" ? undefined : filters.type}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Savings by society"
        caption="Compares all three societies regardless of the Society filter above — select one to highlight it here"
        table={{
          headers: ["Society", "Savings deposits"],
          rows: barData.map((d) => [d.label, formatNaira(d.value)]),
        }}
      >
        <BarChart
          data={barData}
          color="var(--chart-1)"
          valueFormatter={formatNaira}
          highlightLabel={
            filters.societyId === "all" ? undefined : societyName(filters.societyId)
          }
        />
      </ChartCard>

      <div>
        <h2 className="font-heading text-sm font-bold text-brand-ink">
          Recent activity
        </h2>
        <p className="mt-1 text-xs text-brand-ink/55">
          Sample rows, scoped by Society and Transaction type above.
        </p>
        <div className="mt-2">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Member</TableHeaderCell>
                <TableHeaderCell>Society</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activityRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-brand-ink/50">
                    No activity matches the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                activityRows.map((entry) => (
                  <TableRow key={`${entry.member}-${entry.date}`}>
                    <TableCell>{entry.member}</TableCell>
                    <TableCell>{societyName(entry.societyId)}</TableCell>
                    <TableCell>{entry.type}</TableCell>
                    <TableCell className="tabular-nums">{entry.amount}</TableCell>
                    <TableCell className="tabular-nums">{entry.date}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
