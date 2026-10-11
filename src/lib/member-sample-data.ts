/**
 * Sample member figures.
 *
 * The API does not expose a member's passbook, contributions or
 * transactions yet (GET /api/v1/members/me returns the profile only),
 * so everything here is hand-authored, deterministic sample data — the
 * same convention as src/lib/dashboard-data.ts. Every screen that
 * renders it carries a "Sample figures" badge. Replace this module with
 * real queries when the endpoints exist; the shapes are chosen to
 * resemble what a passbook/transactions response would look like.
 */

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const SCHEMES = [
  "Dev levy",
  "Shares",
  "Savings",
  "Welfare",
  "Festival",
  "Building project",
] as const;
export type Scheme = (typeof SCHEMES)[number];

export const SHEET_YEARS = [2026, 2025] as const;
export type SheetYear = (typeof SHEET_YEARS)[number];

/** null = nothing recorded for that month yet. */
type Row = (number | null)[];

const SHEETS: Record<SheetYear, Record<Scheme, Row>> = {
  2026: {
    "Dev levy": [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, null, null, null],
    Shares: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, null, null, null],
    Savings: [20000, 15000, 20000, 25000, 20000, 20000, 30000, 20000, 25000, null, null, null],
    Welfare: [500, 500, 500, 500, 500, 500, 500, 500, 500, null, null, null],
    Festival: [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, null, null, null],
    "Building project": [null, null, 10000, null, null, 10000, null, null, 10000, null, null, null],
  },
  2025: {
    "Dev levy": [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000],
    Shares: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
    Savings: [15000, 15000, 20000, 15000, 20000, 15000, 20000, 20000, 15000, 20000, 20000, 25000],
    Welfare: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500],
    Festival: [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000],
    "Building project": [null, null, 10000, null, null, 10000, null, null, 10000, null, null, 10000],
  },
};

export function sheetFor(year: SheetYear) {
  return SHEETS[year];
}

export function rowTotal(row: Row): number {
  return row.reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

export function monthTotal(year: SheetYear, monthIndex: number): number {
  return SCHEMES.reduce((sum, s) => sum + (SHEETS[year][s][monthIndex] ?? 0), 0);
}

export function yearTotal(year: SheetYear): number {
  return SCHEMES.reduce((sum, s) => sum + rowTotal(SHEETS[year][s]), 0);
}

/** Months in the year with at least one recorded payment. */
export function monthsFunded(year: SheetYear): number {
  return MONTH_LABELS.filter((_, i) => monthTotal(year, i) > 0).length;
}

export const BROUGHT_FORWARD_2026 = 485000;

export const CURRENT_YEAR: SheetYear = 2026;

export interface SampleTransaction {
  id: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  description: string;
  scheme: string;
  direction: "in" | "out";
  amount: number;
}

export const SAMPLE_TRANSACTIONS: SampleTransaction[] = [
  { id: "t9", date: "2026-09-28", description: "Monthly contribution", scheme: "Savings", direction: "in", amount: 25000 },
  { id: "t8", date: "2026-09-28", description: "Monthly contribution", scheme: "Shares", direction: "in", amount: 5000 },
  { id: "t7", date: "2026-09-15", description: "Building project levy", scheme: "Building project", direction: "in", amount: 10000 },
  { id: "t6", date: "2026-09-02", description: "Loan instalment", scheme: "Loan", direction: "out", amount: 18500 },
  { id: "t5", date: "2026-08-28", description: "Monthly contribution", scheme: "Savings", direction: "in", amount: 20000 },
  { id: "t4", date: "2026-08-28", description: "Monthly contribution", scheme: "Dev levy", direction: "in", amount: 1000 },
  { id: "t3", date: "2026-08-02", description: "Loan instalment", scheme: "Loan", direction: "out", amount: 18500 },
  { id: "t2", date: "2026-07-28", description: "Monthly contribution", scheme: "Savings", direction: "in", amount: 30000 },
  { id: "t1", date: "2026-07-28", description: "Festival contribution", scheme: "Festival", direction: "in", amount: 2000 },
];

/** "₦12,500" — full figure, no K/M shortening, for passbook-style use. */
export function formatNairaFull(value: number): string {
  return `₦${value.toLocaleString("en-US")}`;
}
