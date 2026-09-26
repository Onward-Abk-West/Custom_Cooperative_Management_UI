"use client";

import { useState } from "react";

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * Horizontal bar chart, single series — one nominal series (which
 * society) takes one hue for every bar (color-formula.md: "the same
 * slot-1 hue … so no legend box, the title names it"). Bars are the
 * hit target themselves (no crosshair, per interaction.md's
 * bars-and-cells rule), each with its own hover/focus tooltip and a
 * direct label at the tip so the value reads without hovering too.
 */
export function BarChart({
  data,
  color = "var(--chart-1)",
  valueFormatter,
  highlightLabel,
}: {
  data: BarDatum[];
  color?: string;
  valueFormatter: (v: number) => string;
  /** When set, dims every bar except this one — the "emphasis" form
   * (choosing-a-form.md) used here to let the Society filter narrow
   * this comparison without hiding the other societies for context. */
  highlightLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const rowH = 40;
  const barH = 20;
  const padR = 64;
  const labelW = 220; // wide enough for the longest society name at 11px
  const H = data.length * rowH + 8;
  const plotW = W - labelW - padR;
  const max = Math.max(...data.map((d) => d.value), 1);

  function barPath(x0: number, y0: number, w: number, h: number, r: number) {
    const x1 = x0 + w;
    if (w <= r) {
      return `M${x0},${y0} L${x1},${y0} L${x1},${y0 + h} L${x0},${y0 + h} Z`;
    }
    return `M${x0},${y0} L${x1 - r},${y0} Q${x1},${y0} ${x1},${y0 + r} L${x1},${y0 + h - r} Q${x1},${y0 + h} ${x1 - r},${y0 + h} L${x0},${y0 + h} Z`;
  }

  return (
    // overflow-x-auto + min-w, same reasoning as LineChart: the
    // society-name labels shrink to illegible on a phone-width card
    // otherwise, so narrow screens get horizontal scroll instead.
    <div className="overflow-x-auto">
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full min-w-[480px]"
      role="img"
      aria-label="Horizontal bar chart of savings by society"
    >
      {data.map((d, i) => {
        const y0 = i * rowH + (rowH - barH) / 2;
        const w = (d.value / max) * plotW;
        const isHover = hover === i;
        const isDimmed =
          highlightLabel !== undefined && highlightLabel !== d.label && !isHover;
        return (
          <g
            key={d.label}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            style={{ cursor: "pointer" }}
          >
            <text
              x={labelW - 10}
              y={y0 + barH / 2 + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--brand-ink)"
              opacity={0.75}
            >
              {d.label}
            </text>
            {/* Hit area extends past the painted bar, per interaction.md. */}
            <rect
              x={labelW}
              y={i * rowH}
              width={plotW + padR}
              height={rowH}
              fill="transparent"
            />
            <path
              d={barPath(labelW, y0, Math.max(w, 4), barH, 4)}
              fill={color}
              opacity={isDimmed ? 0.32 : isHover ? 1 : 0.9}
            />
            <text
              x={labelW + w + 8}
              y={y0 + barH / 2 + 4}
              fontSize={11}
              fontWeight={600}
              fill="var(--brand-ink)"
            >
              {valueFormatter(d.value)}
            </text>

            {isHover ? (
              <g>
                <rect
                  x={Math.min(labelW + w + 8, W - 118)}
                  y={y0 - 24}
                  width={110}
                  height={20}
                  rx={6}
                  fill="var(--brand-ink)"
                />
                <text
                  x={Math.min(labelW + w + 8, W - 118) + 55}
                  y={y0 - 10}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="var(--brand-cream)"
                >
                  {d.label}: {valueFormatter(d.value)}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
    </div>
  );
}
