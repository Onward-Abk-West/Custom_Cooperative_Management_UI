import { Money } from "@/components/money/MoneyPopup";

/**
 * KPI stat tile — dataviz skill's "figure" contract: label, a
 * compact value, an optional signed delta (status color, always
 * paired with an icon + text, never color alone — see color-formula
 * / marks-and-anatomy), and an optional sparkline trend.
 *
 * The sparkline itself is drawn in the muted/de-emphasis ink so it
 * reads as texture, not a second data series — only its final point
 * (the current period) carries the card's accent color, per the
 * mark-spec figure contract ("trend … in the de-emphasis hue,
 * current period in the accent").
 */
export interface StatCardProps {
  label: string;
  /** Display text for the figure. Ignored when `money` is given. */
  value?: string;
  /** A naira amount: shown comma-formatted and opens the amount-in-words popup. */
  money?: number;
  /** Signed, e.g. "+8.2%" or "-3 societies" — vs a named period. */
  delta?: string;
  deltaPeriod?: string;
  /** Direction the delta color should read as good. Defaults to "up". */
  deltaGoodDirection?: "up" | "down";
  trend?: number[];
  /** CSS color (a var(--chart-N) or var(--brand-*) token) for the
   * sparkline's current-period point. */
  accent?: string;
  /** CSS color for the big figure. Defaults to the body ink. */
  valueColor?: string;
  /** Muted color tint for the whole metric tile. */
  tone?: "green" | "red" | "blue" | "gold";
  /** Short context or data availability note below the figure. */
  note?: string;
}

function deltaSign(delta: string): 1 | -1 | 0 {
  if (delta.trim().startsWith("-")) return -1;
  if (delta.trim().startsWith("+")) return 1;
  return 0;
}

function Sparkline({ values, accent }: { values: number[]; accent: string }) {
  const w = 72;
  const h = 28;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label="Trend over the last six months"
      className="shrink-0"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--brand-ink)"
        strokeOpacity={0.3}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Surface ring so the accent dot stays legible against the line. */}
      <circle cx={lastX} cy={lastY} r={4} fill="var(--brand-cream)" />
      <circle cx={lastX} cy={lastY} r={2.5} fill={accent} />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  money,
  delta,
  deltaPeriod = "last month",
  deltaGoodDirection = "up",
  trend,
  accent = "var(--chart-1)",
  valueColor = "var(--brand-ink)",
  tone,
  note,
}: StatCardProps) {
  const sign = delta ? deltaSign(delta) : 0;
  const isGood =
    sign === 0 ? null : deltaGoodDirection === "up" ? sign > 0 : sign < 0;
  const deltaColor =
    isGood === null ? "var(--brand-ink)" : isGood ? "var(--status-good)" : "var(--status-bad)";

  return (
    <div
      className="flex min-w-0 flex-col gap-3 rounded-2xl border p-5"
      style={tone ? {
        borderColor: `color-mix(in srgb, var(--stat-${tone}) 35%, var(--brand-line))`,
        backgroundColor: `color-mix(in srgb, var(--stat-${tone}) 8%, var(--surface-card))`,
      } : undefined}
    >
      {/* Label gets its own full-width row so a long one ("Loans
          outstanding") stays on a single line instead of wrapping
          beside the figure; the figure then gets the full card width, so a
          full comma-formatted amount fits, and the delta and sparkline
          share the last row. */}
      <p
        title={label}
        className="truncate text-xs font-bold uppercase tracking-wide text-label"
      >
        {label}
      </p>
      {note ? <p className="-mt-2 text-xs text-brand-ink/55">{note}</p> : null}
      <p
        className="min-w-0 text-2xl font-bold tabular-nums [overflow-wrap:anywhere]"
        style={{ color: valueColor }}
      >
        {money !== undefined ? <Money value={money} label={label} /> : value}
      </p>

      {delta || (trend && trend.length >= 2) ? (
        <div className="flex items-center justify-between gap-3">
          {delta ? (
            <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
              <span
                aria-hidden
                className="inline-flex h-4 w-4 items-center justify-center"
                style={{ color: deltaColor }}
              >
                {sign >= 0 ? (
                  <svg viewBox="0 0 12 12" width={10} height={10} fill="none">
                    <path
                      d="M6 10V2M6 2L2.5 5.5M6 2l3.5 3.5"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 12 12" width={10} height={10} fill="none">
                    <path
                      d="M6 2v8M6 10l-3.5-3.5M6 10l3.5-3.5"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="font-semibold" style={{ color: deltaColor }}>
                {delta}
              </span>
              <span className="text-brand-ink/50">vs {deltaPeriod}</span>
            </p>
          ) : (
            <span />
          )}
          {trend && trend.length >= 2 ? (
            <Sparkline values={trend} accent={accent} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
