import type { FinancialCategory } from "@/lib/api/financial-transactions";

/**
 * A member's own financial records, grouped by category.
 *
 * The backend stores one row per recorded transaction — a category
 * (the 15 values in FINANCIAL_CATEGORIES), an amount and a date — and
 * nothing else: no direction (deposit / repayment) and no running
 * balance. So a "total" here is simply the sum of the amounts recorded
 * under that category, and the UI labels it "Total recorded" rather
 * than "balance".
 *
 * There is no endpoint yet that returns a member's own records
 * (GET /api/v1/members/me/financial-records/export is a file download,
 * not JSON), so SAMPLE_MEMBER_RECORDS below is hand-authored sample
 * data. Replace getMemberRecords() with a real fetch once that endpoint
 * exists; MemberHome only depends on the MemberRecordGroup shape.
 */
export interface RecordEntry {
  id: string;
  /** "yyyy-MM-dd", same shape as the API's DateOnly. */
  date: string;
  amount: number;
  /** Who recorded it (the API has createdByUserId; a name needs a lookup). */
  recordedBy?: string;
}

export interface MemberRecordGroup {
  category: FinancialCategory;
  entries: RecordEntry[];
}

export type RecordKind = "savings" | "shares" | "loan";

/** Loans end in "Loan"; "Car Loan Savings" etc. are savings schemes. */
export function recordKind(category: FinancialCategory): RecordKind {
  if (category === "Shares") return "shares";
  if (category.endsWith("Loan")) return "loan";
  return "savings";
}

export function totalOf(group: MemberRecordGroup): number {
  return group.entries.reduce((sum, e) => sum + e.amount, 0);
}

/** Newest first. */
export function entriesNewestFirst(group: MemberRecordGroup): RecordEntry[] {
  return [...group.entries].sort((a, b) => b.date.localeCompare(a.date));
}

export interface HistoryRow extends RecordEntry {
  /** Sum of every entry up to and including this one, oldest first. */
  runningTotal: number;
}

export interface HistoryMonth {
  /** "2026-09" */
  key: string;
  /** "September 2026" */
  label: string;
  total: number;
  rows: HistoryRow[];
}

/**
 * A record's full transaction history: newest first, each row carrying
 * the running total at that point, grouped by month with a month total.
 * `limit` keeps only the newest N rows (running totals stay correct,
 * since they are computed over the whole history first).
 */
export function transactionHistory(group: MemberRecordGroup, limit?: number): HistoryMonth[] {
  const oldestFirst = [...group.entries].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const rows: HistoryRow[] = oldestFirst.map((e) => {
    running += e.amount;
    return { ...e, runningTotal: running };
  });
  const newestFirst = rows.reverse();
  const shown = limit === undefined ? newestFirst : newestFirst.slice(0, limit);

  const months: HistoryMonth[] = [];
  for (const row of shown) {
    const key = row.date.slice(0, 7);
    let month = months[months.length - 1];
    if (!month || month.key !== key) {
      const [y, m] = key.split("-").map(Number);
      month = {
        key,
        label: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }),
        total: 0,
        rows: [],
      };
      months.push(month);
    }
    month.rows.push(row);
    month.total += row.amount;
  }
  return months;
}

/** "5 Sep 2026" from "2026-09-05", independent of the viewer's timezone. */
export function formatEntryDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const SAMPLE_MEMBER_RECORDS: MemberRecordGroup[] = [
  {
    category: "Savings",
    entries: [
      { id: "s1", date: "2026-04-05", amount: 25000, recordedBy: "Society Admin" },
      { id: "s2", date: "2026-05-05", amount: 25000, recordedBy: "Society Admin" },
      { id: "s3", date: "2026-06-05", amount: 30000, recordedBy: "Society Admin" },
      { id: "s4", date: "2026-07-05", amount: 25000, recordedBy: "Society Admin" },
      { id: "s5", date: "2026-08-05", amount: 25000, recordedBy: "Society Admin" },
      { id: "s6", date: "2026-09-05", amount: 30000, recordedBy: "Society Admin" },
    ],
  },
  {
    category: "Shares",
    entries: [
      { id: "h1", date: "2026-01-15", amount: 50000, recordedBy: "Society Admin" },
      { id: "h2", date: "2026-06-15", amount: 50000, recordedBy: "Society Admin" },
    ],
  },
  {
    category: "Normal Loan",
    entries: [
      { id: "l1", date: "2026-05-20", amount: 120000, recordedBy: "Society Admin" },
      { id: "l2", date: "2026-06-20", amount: 12500, recordedBy: "Society Admin" },
      { id: "l3", date: "2026-07-20", amount: 12500, recordedBy: "Society Admin" },
      { id: "l4", date: "2026-08-20", amount: 12500, recordedBy: "Society Admin" },
      { id: "l5", date: "2026-09-20", amount: 12500, recordedBy: "Society Admin" },
    ],
  },
  {
    category: "Special Savings",
    entries: [
      { id: "p1", date: "2026-07-10", amount: 10000, recordedBy: "Society Admin" },
      { id: "p2", date: "2026-08-10", amount: 10000, recordedBy: "Society Admin" },
      { id: "p3", date: "2026-09-10", amount: 15000, recordedBy: "Society Admin" },
    ],
  },
  {
    category: "Land Savings",
    entries: [
      { id: "d1", date: "2026-03-12", amount: 40000, recordedBy: "Society Admin" },
      { id: "d2", date: "2026-08-12", amount: 40000, recordedBy: "Society Admin" },
    ],
  },
];

/** Sample now; swap for a real API call later (see the note above). */
export function getMemberRecords(): MemberRecordGroup[] {
  return SAMPLE_MEMBER_RECORDS;
}
