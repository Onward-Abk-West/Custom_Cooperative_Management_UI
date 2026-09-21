"use client";

import { useState } from "react";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

/**
 * Multi-series line chart — crosshair snaps to the nearest category
 * and one tooltip lists every series at that point (interaction.md:
 * "the pointer never has to land on a line to get a value"). Legend
 * is mandatory here since there are 2 series; the line end also
 * carries a direct label so the story reads without hovering at all.
 */
export function LineChart({
  categories,
  series,
  valueFormatter,
}: {
  categories: string[];
  series: LineSeries[];
  valueFormatter: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const H = 260;
  const padL = 48;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = categories.length;

  const allValues = series.flatMap((s) => s.values);
  const maxRaw = Math.max(...allValues, 1);
  const maxVal = maxRaw * 1.15;

  const xAt = (i: number) => padL + (n === 1 ? 0 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => padT + plotH - (v / maxVal) * plotH;

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  function handlePointer(clientX: number, rect: DOMRect) {
    const relX = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((relX - padL) / plotW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, idx)));
  }

  const activeIdx = hover ?? n - 1;

  return (
    <div className="relative">
      {/* Legend — a line-key swatch per series (marks-and-anatomy: legends mirror the mark). */}
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-ink/70"
          >
            <svg width={14} height={8} aria-hidden>
              <line
                x1={0}
                y1={4}
                x2={14}
                y2={4}
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
            {s.label}
          </span>
        ))}
      </div>

      {/* min-w keeps axis/tooltip text at a legible physical size on a
          phone-width card — an SVG scaled down to fit a ~300px card
          shrinks its text illegibly, so below that width the chart
          gets its own horizontal scroll instead (the same relief the
          data table already uses), rather than becoming unreadable. */}
      <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[520px]"
        role="img"
        aria-label="Line chart of savings deposits and loan repayments over the last six months"
        onPointerMove={(e) =>
          handlePointer(e.clientX, e.currentTarget.getBoundingClientRect())
        }
        onPointerLeave={() => setHover(null)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setHover(Math.min(n - 1, activeIdx + 1));
          if (e.key === "ArrowLeft") setHover(Math.max(0, activeIdx - 1));
        }}
        onFocus={() => setHover((h) => h ?? n - 1)}
      >
        {/* Gridlines — hairline, one step off surface, recessive. */}
        {gridSteps.map((g) => {
          const y = padT + plotH - g * plotH;
          return (
            <g key={g}>
              <line
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="var(--brand-line)"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill="var(--brand-ink)"
                opacity={0.5}
              >
                {valueFormatter(g * maxVal)}
              </text>
            </g>
          );
        })}

        {/* X-axis category labels */}
        {categories.map((c, i) => (
          <text
            key={c}
            x={xAt(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={9}
            fill="var(--brand-ink)"
            opacity={0.55}
          >
            {c}
          </text>
        ))}

        {/* Crosshair */}
        {hover !== null ? (
          <line
            x1={xAt(hover)}
            y1={padT}
            x2={xAt(hover)}
            y2={padT + plotH}
            stroke="var(--brand-ink)"
            strokeOpacity={0.25}
            strokeWidth={1}
          />
        ) : null}

        {series.map((s) => {
          const path = s.values
            .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`)
            .join(" ");
          const lastX = xAt(n - 1);
          const lastY = yAt(s.values[n - 1]);
          return (
            <g key={s.key}>
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* End marker + direct label — "lines: value at the end". */}
              <circle cx={lastX} cy={lastY} r={4} fill="var(--brand-cream)" />
              <circle cx={lastX} cy={lastY} r={2.5} fill={s.color} />
              <text
                x={lastX}
                y={lastY - 8}
                textAnchor="end"
                fontSize={9}
                fontWeight={600}
                fill="var(--brand-ink)"
              >
                {valueFormatter(s.values[n - 1])}
              </text>

              {hover !== null ? (
                <>
                  <circle
                    cx={xAt(hover)}
                    cy={yAt(s.values[hover])}
                    r={4}
                    fill="var(--brand-cream)"
                  />
                  <circle
                    cx={xAt(hover)}
                    cy={yAt(s.values[hover])}
                    r={2.5}
                    fill={s.color}
                  />
                </>
              ) : null}
            </g>
          );
        })}

        {/* Tooltip — one box, every series, at the hovered category. */}
        {hover !== null
          ? (() => {
              const boxW = 132;
              const boxH = 18 + series.length * 14;
              const rawX = xAt(hover) + 10;
              const bx = rawX + boxW > W - padR ? xAt(hover) - boxW - 10 : rawX;
              const by = padT + 4;
              return (
                <g>
                  <rect
                    x={bx}
                    y={by}
                    width={boxW}
                    height={boxH}
                    rx={8}
                    fill="var(--brand-cream)"
                    stroke="var(--brand-line)"
                  />
                  <text
                    x={bx + 10}
                    y={by + 16}
                    fontSize={10}
                    fontWeight={700}
                    fill="var(--brand-ink)"
                  >
                    {categories[hover]}
                  </text>
                  {series.map((s, i) => (
                    <g key={s.key}>
                      <line
                        x1={bx + 10}
                        y1={by + 28 + i * 14}
                        x2={bx + 22}
                        y2={by + 28 + i * 14}
                        stroke={s.color}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                      <text
                        x={bx + boxW - 10}
                        y={by + 32 + i * 14}
                        textAnchor="end"
                        fontSize={10}
                        fontWeight={700}
                        fill="var(--brand-ink)"
                      >
                        {valueFormatter(s.values[hover])}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })()
          : null}
      </svg>
      </div>
    </div>
  );
}
