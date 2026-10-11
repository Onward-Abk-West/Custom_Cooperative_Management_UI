"use client";

import { useEffect, useRef, useState } from "react";
import { useMoneyPopup } from "@/components/money/MoneyPopup";
import { formatNairaCompact } from "@/lib/money";

/**
 * Rounds the top of the y-axis up to a value whose quarter steps are
 * round numbers (1, 1.2, 1.6, 2, 2.4, 3.2, 4, 4.8, 6, 8 x a power of
 * ten), so every gridline label is a clean ₦ figure instead of
 * something like ₦361,250.73.
 */
function niceTop(x: number): number {
  const pow = 10 ** Math.floor(Math.log10(Math.max(x, 1)));
  const steps = [1, 1.2, 1.6, 2, 2.4, 3.2, 4, 4.8, 6, 8, 10];
  const m = x / pow;
  return (steps.find((st) => st >= m) ?? 10) * pow;
}

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
  const { show } = useMoneyPopup();

  // Lay the chart out at the card's real pixel width instead of
  // scaling a fixed 640px drawing down (which shrank the text to
  // illegibility on phones and forced sideways scrolling that hid the
  // latest months). Axis ticks shorten to ₦2.4M only when cramped.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setW(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 260;
  // Cramped (phone) layouts shorten axis ticks to ₦2.4M; wider ones
  // have room for a full-comma tick such as ₦1,600,000.
  const compactAxis = W < 480;
  const tickFormatter = compactAxis ? formatNairaCompact : valueFormatter;
  const padL = compactAxis ? 46 : 76;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = categories.length;

  const allValues = series.flatMap((s) => s.values);
  const maxRaw = Math.max(...allValues, 1);
  const maxVal = niceTop(maxRaw * 1.05);

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

      <div ref={wrapRef} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
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
                {tickFormatter(g * maxVal)}
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
                role="button"
                tabIndex={0}
                aria-label={`${s.label}: ${valueFormatter(s.values[n - 1])}. Show in words`}
                style={{ cursor: "pointer" }}
                onClick={(e) =>
                  show(s.values[n - 1], e.currentTarget.getBoundingClientRect(), { label: s.label })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    show(s.values[n - 1], e.currentTarget.getBoundingClientRect(), { label: s.label });
                  }
                }}
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
              const boxW = 150;
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
