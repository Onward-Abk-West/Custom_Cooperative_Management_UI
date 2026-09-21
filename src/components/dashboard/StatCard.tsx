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
  value: string;
  /** Signed, e.g. "+8.2%" or "-3 societies" — vs a named period. */
  delta?: string;
  deltaPeriod?: string;
  /** Direction the delta color should read as good. Defaults to "up". */
  deltaGoodDirection?: "up" | "down";
  trend?: number[];
  /** CSS color (a var(--chart-N) or var(--brand-*) token) for the
   * sparkline's current-period point. */
  accent?: string;
}

function deltaSign(delta: string): 1 | -1 | 0 {
  if (delta.trim().startsWith("-")) return -1;
  if (delta.trim().startsWith("+")) return 1;
  return 0;
}

function Sparkline({ values, accent }: { values: number[]; accent: string }) {
  const w = 96;
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
  delta,
  deltaPeriod = "last month",
  deltaGoodDirection = "up",
  trend,
  accent = "var(--chart-1)",
}: StatCardProps) {
  const sign = delta ? deltaSign(delta) : 0;
  const isGood =
    sign === 0 ? null : deltaGoodDirection === "up" ? sign > 0 : sign < 0;
  const deltaColor =
    isGood === null ? "var(--brand-ink)" : isGood ? "var(--status-good)" : "var(--status-bad)";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-line bg-surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/60">
            {label}
          </p>
          <p className="mt-1.5 truncate text-2xl font-semibold text-brand-ink">
            {value}
          </p>
        </div>
        {trend && trend.length >= 2 ? (
          <Sparkline values={trend} accent={accent} />
        ) : null}
      </div>

      {delta ? (
        <p className="flex items-center gap-1.5 text-xs">
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
      ) : null}
    </div>
  );
}
