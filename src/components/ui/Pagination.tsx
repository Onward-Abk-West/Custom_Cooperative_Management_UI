"use client";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function Pagination({
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const start = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const end = Math.min(pageNumber * pageSize, totalCount);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm text-brand-ink/65">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>Showing {start}–{end} of {totalCount.toLocaleString()} records</span>
        <label className="flex items-center gap-2">
          <span>Rows</span>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-brand-line bg-surface-card px-2 py-1.5 text-brand-ink outline-none focus:border-brand-gold"
          >
            {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <span>per page</span>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={pageNumber <= 1} onClick={() => onPageChange(Math.max(1, pageNumber - 1))} className="rounded-full border border-brand-line px-3 py-1.5 font-medium transition hover:bg-brand-line/25 disabled:opacity-40">Previous</button>
        <span aria-live="polite">Page {pageNumber} of {Math.max(1, totalPages)}</span>
        <button type="button" disabled={pageNumber >= totalPages} onClick={() => onPageChange(Math.min(Math.max(1, totalPages), pageNumber + 1))} className="rounded-full border border-brand-line px-3 py-1.5 font-medium transition hover:bg-brand-line/25 disabled:opacity-40">Next</button>
      </div>
    </nav>
  );
}
