import type { ReactNode } from "react";

/**
 * Rounded content card with an icon tile, title and optional subtitle —
 * the repeating unit of the member screens (Profile, Settings).
 * dashboard). `right` renders at the top-right of the card header.
 */
export function MemberCard({
  icon,
  title,
  subtitle,
  right,
  children,
  id,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 rounded-3xl border border-brand-line bg-surface-card p-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-green/15 text-brand-green">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-bold text-heading">{title}</h2>
          {subtitle ? <p className="text-sm text-brand-ink/60">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

/** Label on the left (muted), value on the right — Profile-style row. */
export function KeyValueRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-brand-line/70 py-3 first:border-t-0">
      <dt className="shrink-0 text-sm text-brand-ink/60">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right text-sm font-medium text-brand-ink ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
