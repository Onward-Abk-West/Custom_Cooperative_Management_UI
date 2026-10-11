import type { ReactNode } from "react";

/**
 * Title + subtitle + right-aligned actions, pinned to the top on phones
 * while the page scrolls underneath (the native-app header pattern).
 * The negative margin / padding pair lets the pinned bar run edge to
 * edge inside AppShell's padded <main>.
 */
export function MemberPageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Optional leading control, e.g. a back link. */
  back?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center gap-3 bg-brand-cream/95 px-4 pb-3 pt-4 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0 md:backdrop-blur-none">
      {back}
      <div className="min-w-0 flex-1">
        <h1 className="font-heading truncate text-2xl font-bold text-heading">{title}</h1>
        {subtitle ? (
          <p className="truncate text-sm text-brand-ink/60">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </header>
  );
}
