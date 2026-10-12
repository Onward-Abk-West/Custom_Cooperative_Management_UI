import { FINANCIAL_CATEGORIES, type FinancialCategory } from "@/lib/api/financial-transactions";

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
  /** Set when entries from several categories are listed together. */
  category?: FinancialCategory;
}

export interface MemberRecordGroup {
  category: FinancialCategory;
  entries: RecordEntry[];
}

/**
 * The cards a member sees. Every one of the 15 backend categories lands
 * in exactly one card: shares, the savings schemes, the loans, and a
 * small "other" card for the two schemes that are neither.
 */
export type RecordGroupId = "shares" | "savings" | "loans" | "other";

/**
 * Category -> card. Typed as a Record over every FinancialCategory, so
 * adding a category on the backend without placing it here is a compile
 * error. "Car Loan Savings", "B. Loan Savings" and "Okada Loan Savings"
 * are savings schemes tied to a loan, so they sit under Savings, not
 * Loans.
 *
 * Kasolayo and Household are filed under "other" because their nature
 * is not stated anywhere in the code base — move them with a one-line
 * change here if they belong with Savings or Loans.
 */
export const CATEGORY_GROUP: Record<FinancialCategory, RecordGroupId> = {
  Shares: "shares",
  Savings: "savings",
  "Car Loan Savings": "savings",
  "B. Loan Savings": "savings",
  "Okada Loan Savings": "savings",
  "Special Savings": "savings",
  "Land Savings": "savings",
  "Normal Loan": "loans",
  "Car Loan": "loans",
  "Building Loan": "loans",
  "Okada Loan": "loans",
  "Education Loan": "loans",
  "Furniture Loan": "loans",
  Kasolayo: "other",
  Household: "other",
};

/** Card order, and the label on each. */
export const RECORD_GROUPS: { id: RecordGroupId; label: string }[] = [
  { id: "shares", label: "Shares" },
  { id: "savings", label: "Savings" },
  { id: "loans", label: "Loans" },
  { id: "other", label: "Other" },
];

/** One card: every category of one kind that has records. */
export interface RecordGroup {
  id: RecordGroupId;
  label: string;
  /** In FINANCIAL_CATEGORIES order, only those with at least one entry. */
  categories: MemberRecordGroup[];
}

/**
 * Sorts per-category records into cards. Cards with no records are left
 * out, so a member with no loans simply has no Loans card.
 */
export function groupRecords(records: MemberRecordGroup[]): RecordGroup[] {
  const order = new Map<FinancialCategory, number>(
    FINANCIAL_CATEGORIES.map((c, i) => [c, i])
  );
  return RECORD_GROUPS.map(({ id, label }) => ({
    id,
    label,
    categories: records
      .filter((r) => CATEGORY_GROUP[r.category] === id && r.entries.length > 0)
      .sort((a, b) => (order.get(a.category) ?? 0) - (order.get(b.category) ?? 0)),
  })).filter((g) => g.categories.length > 0);
}

/** Sum of everything recorded under every category in the card. */
export function groupTotal(group: RecordGroup): number {
  return group.categories.reduce((sum, c) => sum + totalOf(c), 0);
}

export function groupEntryCount(group: RecordGroup): number {
  return group.categories.reduce((n, c) => n + c.entries.length, 0);
}

/**
 * Entries of the whole card, or of one category in it, each tagged with
 * its category so a mixed list can say which one a row belongs to.
 */
export function groupEntries(
  group: RecordGroup,
  category: FinancialCategory | null
): RecordEntry[] {
  return group.categories
    .filter((c) => category === null || c.category === category)
    .flatMap((c) => c.entries.map((e) => ({ ...e, category: c.category })));
}

/** Every entry of every card, each tagged with its category. */
export function allEntries(groups: RecordGroup[]): RecordEntry[] {
  return groups.flatMap((g) => groupEntries(g, null));
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

export interface HistoryOptions {
  /** Keep only the newest N rows (after the date filter). */
  limit?: number;
  /** Inclusive lower bound, "yyyy-MM-dd". Empty / undefined = no bound. */
  from?: string;
  /** Inclusive upper bound, "yyyy-MM-dd". Empty / undefined = no bound. */
  to?: string;
}

/** True when both bounds are set and "from" is after "to". */
export function isInvalidDateRange(from?: string, to?: string): boolean {
  return Boolean(from && to && from > to);
}

/**
 * Transaction history: newest first, each row carrying the running
 * total at that point, grouped by month with a month total.
 *
 * Running totals are computed over the whole history first and the
 * date filter applied afterwards, so a row's "Total" is its true
 * cumulative figure, not a sum that restarts at the filter's start.
 * `limit` keeps only the newest N rows of what the filter leaves.
 */
export function transactionHistory(
  source: { entries: RecordEntry[] },
  options: HistoryOptions = {}
): HistoryMonth[] {
  const { limit, from, to } = options;
  const oldestFirst = [...source.entries].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const rows: HistoryRow[] = oldestFirst.map((e) => {
    running += e.amount;
    return { ...e, runningTotal: running };
  });
  const inRange = rows.filter((r) => (!from || r.date >= from) && (!to || r.date <= to));
  const newestFirst = inRange.reverse();
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

/** Monthly sample entries: [date, amount] pairs under one category. */
function seed(
  prefix: string,
  category: FinancialCategory,
  rows: [string, number][]
): MemberRecordGroup {
  return {
    category,
    entries: rows.map(([date, amount], i) => ({
      id: `${prefix}${i + 1}`,
      date,
      amount,
      recordedBy: "Society Admin",
    })),
  };
}

const SAMPLE_MEMBER_RECORDS: MemberRecordGroup[] = [
  seed("h", "Shares", [
    ["2026-01-15", 50000],
    ["2026-06-15", 50000],
  ]),
  seed("s", "Savings", [
    ["2026-04-05", 25000],
    ["2026-05-05", 25000],
    ["2026-06-05", 30000],
    ["2026-07-05", 25000],
    ["2026-08-05", 25000],
    ["2026-09-05", 30000],
  ]),
  seed("p", "Special Savings", [
    ["2026-07-10", 10000],
    ["2026-08-10", 10000],
    ["2026-09-10", 15000],
  ]),
  seed("d", "Land Savings", [
    ["2026-03-12", 40000],
    ["2026-08-12", 40000],
  ]),
  seed("c", "Car Loan Savings", [
    ["2026-08-18", 20000],
    ["2026-09-18", 20000],
  ]),
  seed("l", "Normal Loan", [
    ["2026-05-20", 120000],
    ["2026-06-20", 12500],
    ["2026-07-20", 12500],
    ["2026-08-20", 12500],
    ["2026-09-20", 12500],
  ]),
  seed("f", "Furniture Loan", [
    ["2026-07-25", 80000],
    ["2026-08-25", 10000],
    ["2026-09-25", 10000],
  ]),
  seed("k", "Kasolayo", [
    ["2026-08-30", 5000],
    ["2026-09-30", 5000],
  ]),
  seed("u", "Household", [["2026-09-02", 35000]]),
];

/** Sample now; swap for a real API call later (see the note above). */
export function getMemberRecords(): MemberRecordGroup[] {
  return SAMPLE_MEMBER_RECORDS;
}
