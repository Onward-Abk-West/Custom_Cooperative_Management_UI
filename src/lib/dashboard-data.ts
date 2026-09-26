/**
 * Sample dashboard data.
 *
 * There is no financial-records backend yet (same caveat as the
 * table on the old dashboard page), so every figure here is
 * hand-authored sample data, not a real ledger — clearly labeled as
 * such wherever it renders. It exists to give the dashboard's charts
 * and filters something realistic to run against: monthly
 * transactions across the three placeholder societies from
 * src/lib/mock-session.ts, split into the three transaction types
 * already used on the old sample table (Savings deposit / Loan
 * repayment / Loan disbursement).
 *
 * Replace entirely once real financial-records queries exist — the
 * shape here (MonthlyEntry rows) is deliberately close to what a real
 * "transactions in range" API response would look like, so swapping
 * the source out shouldn't require reshaping the components that
 * consume it.
 */

export type TransactionType =
  | "Savings deposit"
  | "Loan repayment"
  | "Loan disbursement";

export const TRANSACTION_TYPES: TransactionType[] = [
  "Savings deposit",
  "Loan repayment",
  "Loan disbursement",
];

export interface SocietyRef {
  id: string;
  name: string;
}

export const SOCIETIES: SocietyRef[] = [
  { id: "abk-central", name: "Abeokuta Central Cooperative" },
  { id: "abk-north", name: "Abeokuta North Farmers Society" },
  { id: "abk-east", name: "Abeokuta East Traders Society" },
];

export const MEMBER_COUNTS: Record<string, number> = {
  "abk-central": 214,
  "abk-north": 158,
  "abk-east": 121,
};

/** One month prior — enough to compute a "vs last month" delta on
 * the Total Members stat tile without a full membership history. */
export const MEMBER_COUNTS_PREV: Record<string, number> = {
  "abk-central": 206,
  "abk-north": 151,
  "abk-east": 117,
};

/** Six-month window ending on the app's current sample "today". */
export const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"] as const;
export type MonthLabel = (typeof MONTHS)[number];

export interface MonthlyEntry {
  societyId: string;
  month: MonthLabel;
  type: TransactionType;
  amount: number;
}

/**
 * Deterministic sample series per society/type — not random, so the
 * dashboard looks the same on every load and every screenshot taken
 * of it during review matches the next one.
 */
const BASE_BY_SOCIETY_TYPE: Record<
  string,
  Record<TransactionType, number[]>
> = {
  "abk-central": {
    "Savings deposit": [820000, 865000, 910000, 940000, 905000, 980000],
    "Loan disbursement": [500000, 520000, 540000, 560000, 580000, 600000],
    "Loan repayment": [350000, 365000, 380000, 400000, 410000, 430000],
  },
  "abk-north": {
    "Savings deposit": [540000, 560000, 590000, 610000, 640000, 660000],
    "Loan disbursement": [320000, 330000, 340000, 350000, 365000, 380000],
    "Loan repayment": [220000, 230000, 235000, 245000, 255000, 265000],
  },
  "abk-east": {
    "Savings deposit": [390000, 405000, 420000, 440000, 455000, 470000],
    "Loan disbursement": [200000, 210000, 215000, 225000, 235000, 245000],
    "Loan repayment": [140000, 145000, 150000, 158000, 165000, 172000],
  },
};

export const ALL_ENTRIES: MonthlyEntry[] = SOCIETIES.flatMap((society) =>
  TRANSACTION_TYPES.flatMap((type) =>
    MONTHS.map((month, i) => ({
      societyId: society.id,
      month,
      type,
      amount: BASE_BY_SOCIETY_TYPE[society.id][type][i],
    }))
  )
);

export interface RecentActivityRow {
  member: string;
  societyId: string;
  type: TransactionType;
  amount: string;
  date: string;
}

/** Sample rows for the recent-activity table — same shape/spirit as
 * the previous dashboard page's SAMPLE_ENTRIES, extended with a
 * society so the filter row can scope it. */
export const RECENT_ACTIVITY: RecentActivityRow[] = [
  {
    member: "Adebayo T.",
    societyId: "abk-central",
    type: "Savings deposit",
    amount: "₦25,000",
    date: "2026-09-12",
  },
  {
    member: "Funke O.",
    societyId: "abk-central",
    type: "Loan repayment",
    amount: "₦12,500",
    date: "2026-09-14",
  },
  {
    member: "Chidi N.",
    societyId: "abk-north",
    type: "Savings deposit",
    amount: "₦18,000",
    date: "2026-09-15",
  },
  {
    member: "Kemi A.",
    societyId: "abk-central",
    type: "Loan disbursement",
    amount: "₦150,000",
    date: "2026-09-18",
  },
  {
    member: "Ngozi E.",
    societyId: "abk-east",
    type: "Savings deposit",
    amount: "₦21,000",
    date: "2026-09-18",
  },
  {
    member: "Bola S.",
    societyId: "abk-north",
    type: "Loan repayment",
    amount: "₦9,800",
    date: "2026-09-19",
  },
];

export function formatNaira(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₦${Math.round(abs / 1000)}K`;
  return `${sign}₦${abs}`;
}

/**
 * Loans outstanding before this six-month window — a cooperative's
 * loan book doesn't start at zero, so the running "outstanding
 * balance" stat needs an opening figure to accumulate on top of
 * rather than reading as a raw six-month net (which can swing
 * negative when a society's repayments catch up on older loans).
 */
export const OPENING_LOAN_BALANCE: Record<string, number> = {
  "abk-central": 1_800_000,
  "abk-north": 1_100_000,
  "abk-east": 650_000,
};
