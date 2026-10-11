"use client";

import { Money } from "@/components/money/MoneyPopup";

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * Horizontal bar chart, one row per society: the name on top, then a
 * bar sized against the largest value with its amount at the end. It
 * is plain HTML/CSS rather than SVG so it reflows to any width (long
 * society names and full comma amounts such as ₦5,880,000 never get
 * clipped or need sideways scrolling on a phone). The amount is a
 * <Money> button, so tapping it shows the figure in words.
 */
export function BarChart({
  data,
  color = "var(--chart-1)",
  colors,
  highlightLabel,
}: {
  data: BarDatum[];
  color?: string;
  /** Optional per-bar colours, by row order (cycled). */
  colors?: string[];
  /** When set, dims every bar except this one — lets the Society
   * filter narrow this comparison without hiding the other societies. */
  highlightLabel?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul role="list" aria-label="Savings by society" className="flex flex-col gap-4">
      {data.map((d, i) => {
        const dimmed = highlightLabel !== undefined && highlightLabel !== d.label;
        const fill = colors && colors.length > 0 ? colors[i % colors.length] : color;
        return (
          <li key={d.label} className={dimmed ? "opacity-40" : ""}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-xs font-medium text-brand-ink/75">{d.label}</span>
              <Money
                value={d.value}
                label={d.label}
                className="shrink-0 text-sm font-bold text-brand-ink"
              />
            </div>
            <div className="mt-1.5 h-3.5 w-full overflow-hidden rounded-full bg-brand-line/30">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max((d.value / max) * 100, 1.5)}%`,
                  backgroundColor: fill,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
