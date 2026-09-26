import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

/**
 * Shared table shell — financial records, member lists, and audit
 * logs all need this shape (rows of data, a header row, no per-page
 * styling decisions to remake each time). Deliberately plain: no
 * built-in sorting/pagination/selection, since none of the screens
 * that need those exist yet — add that behavior at the call site (or
 * promote it here once a second screen needs the same behavior,
 * rather than guessing at a shape now).
 */
export function Table({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-line bg-surface-card">
      <table
        className={`w-full border-collapse text-left text-sm ${className}`}
        {...props}
      />
    </div>
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-brand-line/25" {...props} />;
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-brand-line" {...props} />;
}

export function TableRow({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`hover:bg-brand-line/10 ${className}`} {...props} />;
}

export function TableHeaderCell({
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-ink/60 ${className}`}
      {...props}
    />
  );
}

export function TableCell({
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3 text-brand-ink ${className}`} {...props} />;
}
