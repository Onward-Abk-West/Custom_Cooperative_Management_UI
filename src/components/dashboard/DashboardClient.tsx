"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart } from "@/components/dashboard/BarChart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Money } from "@/components/money/MoneyPopup";
import { ApiError } from "@/lib/api-client";
import { getFinancialSummary, type FinancialSummaryData } from "@/lib/api/financial-summary";
import { listSocietyMembers } from "@/lib/api/society-members";
import { readSessionInfo } from "@/lib/session";
import { isSuperadmin, type Role } from "@/lib/roles";
import { useSociety } from "@/lib/society-context";
import { usePendingPinResetCount } from "@/lib/use-pending-pin-resets";

const SAVINGS_CATEGORIES = new Set([
  "Savings", "Car Loan Savings", "B. Loan Savings", "Okada Loan Savings",
  "Special Savings", "Land Savings",
]);

function PendingPinResetsCard({ role, societyId }: { role: Role; societyId: string }) {
  const { count, error } = usePendingPinResetCount(role, societyId, true);
  if (count === null && !error) return null;

  return <Link href="/pin-resets" className="flex items-center justify-between gap-3 rounded-2xl border border-brand-line bg-surface-card p-4 transition hover:border-brand-gold">
    <div>
      <p className="text-sm font-bold text-heading">Pending PIN reset requests</p>
      <p className="mt-0.5 text-xs text-brand-ink/60">{isSuperadmin(role) ? "For the society selected in the sidebar." : "For your society."}</p>
    </div>
    {error ? <span className="text-xs font-semibold text-status-bad">{error}</span> : <span className={`inline-flex min-w-9 items-center justify-center rounded-full px-3 py-1.5 text-sm font-bold ${count && count > 0 ? "bg-status-bad text-white" : "bg-brand-line/30 text-brand-ink/60"}`}>{count}</span>}
  </Link>;
}

export function DashboardClient() {
  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState("");
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const { societyId: switchedSocietyId } = useSociety();
  const societyId = role && isSuperadmin(role) ? switchedSocietyId : ownSocietyId;

  useEffect(() => {
    const info = readSessionInfo();
    setRole(info?.role ?? null);
    setOwnSocietyId(info?.societyId ?? "");
  }, []);

  useEffect(() => {
    if (!role || !societyId) {
      setSummary(null);
      setMemberCount(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadDashboard() {
      try {
        const [financialResponse, firstMemberPage] = await Promise.all([
          getFinancialSummary(role!, societyId),
          listSocietyMembers(societyId, 1, 100),
        ]);
        if (!financialResponse.success || !financialResponse.data) {
          throw new Error(financialResponse.message || "Financial summary could not be loaded.");
        }
        if (!firstMemberPage.success || !firstMemberPage.data) {
          throw new Error(firstMemberPage.message || "Society members could not be loaded.");
        }

        const pages = firstMemberPage.data.totalPages;
        const rest = pages > 1
          ? await Promise.all(Array.from({ length: pages - 1 }, (_, index) =>
              listSocietyMembers(societyId, index + 2, 100)))
          : [];
        const memberPages = [firstMemberPage, ...rest];
        if (memberPages.some((page) => !page.success || !page.data)) {
          throw new Error("The complete society roster could not be loaded.");
        }
        const count = memberPages.reduce((total, page) => total +
          (page.data?.items.filter((item) => item.roles.includes("Member")).length ?? 0), 0);

        if (cancelled) return;
        setSummary(financialResponse.data);
        setMemberCount(count);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Dashboard data could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, [role, societyId, reload]);

  const totals = useMemo(() => {
    const categories = summary?.categoryTotals ?? [];
    return {
      savings: categories.filter((item) => SAVINGS_CATEGORIES.has(item.category))
        .reduce((total, item) => total + item.totalAmount, 0),
      loanCategoryValue: categories.filter((item) => !SAVINGS_CATEGORIES.has(item.category) &&
        !["Shares", "Savings"].includes(item.category))
        .reduce((total, item) => total + item.totalAmount, 0),
    };
  }, [summary]);

  const canHandlePinResets = role === "supervisor" || role === "president" ||
    role === "developer_superadmin" || role === "onward_superadmin";

  if (!role) return <p className="text-sm text-brand-ink/60">Loading dashboard…</p>;
  if (!isSuperadmin(role) && !["admin", "supervisor", "president"].includes(role)) {
    return <p className="text-sm text-brand-ink/60">Dashboard data is not available for your role.</p>;
  }
  if (isSuperadmin(role) && !societyId) {
    return <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/65">Choose a society from the sidebar switcher to view its dashboard.</div>;
  }
  if (!societyId) {
    return <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/65">Your society could not be determined from your session. Try signing in again.</div>;
  }

  const categories = (summary?.categoryTotals ?? []).filter((item) => item.transactionCount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return <div className="flex min-w-0 flex-col gap-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-bold text-heading">Dashboard</h1>
        <p className="mt-1 text-sm text-brand-ink/60">{summary?.societyName ?? "Society overview"} · All-time figures from the backend</p>
      </div>
      <button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading} className="rounded-full border border-brand-line px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-gold disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button>
    </header>

    {canHandlePinResets && <PendingPinResetsCard role={role} societyId={societyId} />}

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-status-bad/30 bg-status-bad/5 p-4 text-sm text-status-bad"><p>{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="font-semibold underline">Try again</button></div>}

    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total savings" money={totals.savings} note="Savings categories recorded to date" tone="green" accent="var(--stat-green)" valueColor="var(--stat-green)" />
      <StatCard label="Loans outstanding" value="Not tracked" note="The backend has no loan balance or repayment status" tone="red" accent="var(--stat-red)" valueColor="var(--stat-red)" />
      <StatCard label="Total members" value={memberCount === null ? (loading ? "Loading…" : "—") : memberCount.toLocaleString()} note="Users with the Member role in this society" tone="blue" accent="var(--stat-blue)" valueColor="var(--stat-blue)" />
      <StatCard label="Repayment rate" value="Not tracked" note="Transactions are not classified as repayments" tone="gold" accent="var(--stat-gold)" valueColor="var(--stat-gold)" />
    </div>

    {summary && <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="rounded-2xl border border-brand-line bg-surface-card p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-label">Financial records</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-heading">{summary.transactionCount.toLocaleString()}</p>
        <p className="mt-1 text-xs text-brand-ink/55">{summary.transactionCount === 1 ? "record" : "records"} · all time</p>
        <div className="mt-4 border-t border-brand-line pt-3">
          <p className="text-xs text-brand-ink/55">Recorded category value</p>
          <Money value={summary.totalAmount} className="mt-1 text-lg font-bold text-heading" />
        </div>
      </div>
      <ChartCard title="Financial records by category" caption="All-time totals returned by the society financial-summary endpoint" table={{
        headers: ["Category", "Records", "Amount"],
        rows: categories.map((item) => [item.category, item.transactionCount.toLocaleString(), <Money key={item.category} value={item.totalAmount} />]),
      }}>
        {categories.length > 0 ? <BarChart data={categories.map((item) => ({ label: item.category, value: item.totalAmount }))} colors={["var(--stat-green)", "var(--stat-red)", "var(--stat-blue)", "var(--stat-gold)"]} /> : <p className="rounded-xl bg-brand-line/15 p-4 text-sm text-brand-ink/55">No financial records have been recorded for this society yet.</p>}
      </ChartCard>
    </section>}

    {!summary && loading && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading dashboard data">{[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-brand-line bg-surface-card" />)}</div>}
  </div>;
}
