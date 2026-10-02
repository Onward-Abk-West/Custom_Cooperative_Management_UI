"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, type ApiEnvelope } from "@/lib/api-client";
import {
  createFinancialTransactionAsAdmin,
  createFinancialTransactionForSociety,
  FINANCIAL_CATEGORIES,
  type CreatedFinancialTransactionData,
  type FinancialCategory,
} from "@/lib/api/financial-transactions";
import { listSocietyMembers, type SocietyMemberSummary } from "@/lib/api/society-members";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";
import type { Role } from "@/lib/roles";

/**
 * "Financial Records" (see src/lib/roles.ts's NAV_ITEMS) — recording a
 * transaction against a member's account. There is no list/read
 * endpoint on the backend yet (AbkWestCoop.Api.Controllers.
 * FinancialTransactionsControllers is create-only), so this page is
 * just the create form — same "show only my own most recent result"
 * pattern as (app)/records' request cards. Only two roles have a
 * create endpoint at all: Admin, implicitly scoped to their own
 * society (session.societyId), and Developer Superadmin, who picks a
 * society via the sidebar switcher (useSociety) exactly like
 * (app)/members does. Member picked by name/email/phone from the
 * society's roster — never a raw User ID.
 */
export default function FinancialRecordsPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState<string>("");

  useEffect(() => {
    const info = readSessionInfo();
    setRole(info?.role ?? null);
    setOwnSocietyId(info?.societyId ?? "");
  }, []);

  if (!role) {
    return <p className="text-sm text-brand-ink/60">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-ink">Financial Records</h1>
        <p className="mt-1 text-sm text-brand-ink/60">
          Record a share, savings, loan or other transaction against a member&apos;s account.
        </p>
      </div>

      {role === "admin" &&
        (ownSocietyId ? (
          <AdminTransactionCard societyId={ownSocietyId} />
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
            Your society could not be determined from your session — try signing in again.
          </div>
        ))}

      {role === "developer_superadmin" && <DeveloperTransactionSection />}

      {role !== "admin" && role !== "developer_superadmin" && (
        <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          There is no financial-transactions action available for your role yet.
        </div>
      )}
    </div>
  );
}

function DeveloperTransactionSection() {
  const { societyId } = useSociety();
  if (!societyId) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
        Choose a society from the sidebar switcher to record a transaction.
      </div>
    );
  }
  return (
    <TransactionForm
      societyId={societyId}
      create={(memberId, category, amount, transactionDate) =>
        createFinancialTransactionForSociety(societyId, memberId, category, amount, transactionDate)
      }
    />
  );
}

function AdminTransactionCard({ societyId }: { societyId: string }) {
  return (
    <TransactionForm
      societyId={societyId}
      create={(memberId, category, amount, transactionDate) =>
        createFinancialTransactionAsAdmin(memberId, category, amount, transactionDate)
      }
    />
  );
}

function TransactionForm({
  societyId,
  create,
}: {
  societyId: string;
  create: (
    memberId: string,
    category: FinancialCategory,
    amount: number,
    transactionDate: string
  ) => Promise<ApiEnvelope<CreatedFinancialTransactionData>>;
}) {
  const [roster, setRoster] = useState<SocietyMemberSummary[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [memberId, setMemberId] = useState("");
  const [category, setCategory] = useState<FinancialCategory>(FINANCIAL_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedFinancialTransactionData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRosterLoading(true);
    listSocietyMembers(societyId, 1, 100)
      .then((response) => {
        if (cancelled) return;
        if (response.success && response.data) {
          setRoster(response.data.items);
        }
      })
      .finally(() => {
        if (!cancelled) setRosterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [societyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!memberId) {
      setError("Select a member.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (!transactionDate) {
      setError("Select a transaction date.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await create(memberId, category, parsedAmount, transactionDate);
      if (!response.success || !response.data) {
        setError(response.message || "The transaction could not be recorded.");
        return;
      }
      setCreated(response.data);
      setMemberId("");
      setAmount("");
      setTransactionDate("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "The transaction could not be recorded."
          : "Could not reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-lg rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-brand-ink">Record a transaction</h2>

      {created && (
        <div className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm">
          <p className="font-semibold text-brand-ink">
            Recorded: {created.category} — {created.amount.toLocaleString()} on{" "}
            {created.transactionDate}.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3">
        <div>
          <label htmlFor="transaction-member" className="mb-1 block text-sm font-medium text-brand-ink">
            Member
          </label>
          <select
            id="transaction-member"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            disabled={rosterLoading}
            className="w-full rounded-full border border-brand-line bg-brand-line/25 px-5 py-3 text-sm text-brand-ink outline-none focus:border-brand-gold focus:bg-white focus:ring-2 focus:ring-brand-gold/30"
          >
            <option value="">{rosterLoading ? "Loading members…" : "Select a member"}</option>
            {roster.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name || member.email || member.phoneNumber || "Member"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="transaction-category" className="mb-1 block text-sm font-medium text-brand-ink">
            Category
          </label>
          <select
            id="transaction-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as FinancialCategory)}
            className="w-full rounded-full border border-brand-line bg-brand-line/25 px-5 py-3 text-sm text-brand-ink outline-none focus:border-brand-gold focus:bg-white focus:ring-2 focus:ring-brand-gold/30"
          >
            {FINANCIAL_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              id="transaction-amount"
              label="Amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex-1">
            <Input
              id="transaction-date"
              label="Transaction date"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="self-start">
          {submitting ? "Recording…" : "Record transaction"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
