"use client";

import { useState } from "react";

export interface StackSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Single 100%-width stacked bar — the dataviz skill's preferred
 * part-to-whole form ("part-to-whole rides on the stacked bar chart";
 * a donut is explicitly de-prioritized in components.md). Three
 * categorical segments here, so a legend is mandatory; each segment
 * is its own hit target with a hover tooltip, separated by a 2px
 * surface gap rather than a border (marks-and-anatomy.md).
 */
export function StackedBar({
  segments,
  valueFormatter,
  highlightKey,
}: {
  segments: StackSegment[];
  valueFormatter: (v: number) => string;
  /** External highlight (e.g. the Transaction type filter) — wins
   * over nothing, but hover always wins over it while active, so a
   * reader exploring the chart isn't fought by the filter's choice. */
  highlightKey?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ?? highlightKey ?? null;

  const W = 640;
  const H = 40;
  const gap = 2;
  const radius = 4;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  // Widths first (raw share of W), shrunk so the (n-1) inter-segment
  // gaps still fit inside W; x-positions are then each their own pure
  // reduction over the widths before them — no mutable accumulator.
  const totalGaps = (segments.length - 1) * gap;
  const scale = totalGaps > 0 ? (W - totalGaps) / W : 1;
  const widths = segments.map((s) => Math.max((s.value / total) * W * scale, 1));
  const rects = segments.map((s, i) => {
    const x = widths.slice(0, i).reduce((sum, w) => sum + w, 0) + i * gap;
    return {
      x,
      w: widths[i],
      s,
      isFirst: i === 0,
      isLast: i === segments.length - 1,
    };
  });

  function segPath(rx0: number, w: number, isFirst: boolean, isLast: boolean) {
    const x1 = rx0 + w;
    const lTop = isFirst ? radius : 0;
    const rTop = isLast ? radius : 0;
    return `M${rx0 + lTop},0
      L${x1 - rTop},0
      ${rTop ? `Q${x1},0 ${x1},${rTop}` : `L${x1},0`}
      L${x1},${H - rTop}
      ${rTop ? `Q${x1},${H} ${x1 - rTop},${H}` : `L${x1},${H}`}
      L${rx0 + lTop},${H}
      ${lTop ? `Q${rx0},${H} ${rx0},${H - lTop}` : `L${rx0},${H}`}
      L${rx0},${lTop}
      ${lTop ? `Q${rx0},0 ${rx0 + lTop},0` : ""}
      Z`;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Transaction mix by type">
        {rects.map(({ x: rx, w, s, isFirst, isLast }) => (
          <path
            key={s.key}
            d={segPath(rx, w, isFirst, isLast)}
            fill={s.color}
            opacity={active === null || active === s.key ? 1 : 0.4}
            onPointerEnter={() => setHover(s.key)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(s.key)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            style={{ cursor: "pointer" }}
          >
            <title>{`${s.label}: ${valueFormatter(s.value)} (${Math.round((s.value / total) * 100)}%)`}</title>
          </path>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <span
            key={s.key}
            className={`flex items-center gap-1.5 text-xs font-medium ${
              active !== null && active !== s.key
                ? "text-brand-ink/40"
                : "text-brand-ink/70"
            }`}
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
            <span className="tabular-nums text-brand-ink/50">
              {Math.round((s.value / total) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
