"use client";

import type { TransactionType } from "@/lib/dashboard-data";

export type DateRangeKey = "6m" | "3m" | "1m";

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  "6m": "Last 6 months",
  "3m": "Last 3 months",
  "1m": "This month",
};

export interface DashboardFilters {
  societyId: string | "all";
  range: DateRangeKey;
  type: TransactionType | "all";
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold uppercase tracking-wide text-brand-ink/55">
        {label}
      </span>
      {children}
    </label>
  );
}

// bg-brand-line/25 (not bg-white/NN) so the field stays legible in
// dark mode too — brand-line and brand-ink both flip together there,
// same convention as the shared Input component.
const selectClass =
  "rounded-lg border border-brand-line bg-brand-line/25 px-3 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-gold";

/**
 * One filter row above every chart and stat on the dashboard
 * (interaction.md: "never inside a chart card, never per-chart").
 * Date range comes first since it's the control every reader reaches
 * for first; every chart, stat and table below re-renders against
 * this same slice, so the numbers always agree with each other.
 */
export function FiltersBar({
  filters,
  onChange,
  societies,
  types,
}: {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  societies: { id: string; name: string }[];
  types: TransactionType[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-brand-line bg-surface-card p-4">
      <FilterField label="Date range">
        <select
          className={selectClass}
          value={filters.range}
          onChange={(e) =>
            onChange({ ...filters, range: e.target.value as DateRangeKey })
          }
        >
          {(Object.keys(DATE_RANGE_LABELS) as DateRangeKey[]).map((k) => (
            <option key={k} value={k}>
              {DATE_RANGE_LABELS[k]}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Society">
        <select
          className={selectClass}
          value={filters.societyId}
          onChange={(e) => onChange({ ...filters, societyId: e.target.value })}
        >
          <option value="all">All societies</option>
          {societies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Transaction type">
        <select
          className={selectClass}
          value={filters.type}
          onChange={(e) =>
            onChange({
              ...filters,
              type: e.target.value as TransactionType | "all",
            })
          }
        >
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FilterField>
    </div>
  );
}
