"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";

export interface ChartTableData {
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Card shell every chart mounts in — title/caption plus the
 * table-view toggle the dataviz skill calls "the accessibility twin
 * of every chart" (components.md, Tier 0). Flipping it swaps the
 * chart for a plain HTML table of the same numbers, so nothing on
 * this dashboard is reachable only by reading a hover tooltip or a
 * color.
 */
export function ChartCard({
  title,
  caption,
  table,
  children,
}: {
  title: string;
  caption?: string;
  table: ChartTableData;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-line bg-surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-bold text-brand-ink">
            {title}
          </h2>
          {caption ? (
            <p className="mt-0.5 text-xs text-brand-ink/55">{caption}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="shrink-0 rounded-full border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-ink/70 transition hover:border-brand-gold hover:text-brand-ink"
        >
          {showTable ? "View chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <Table>
          <TableHead>
            <TableRow>
              {table.headers.map((h) => (
                <TableHeaderCell key={h}>{h}</TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {table.rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j} className={j > 0 ? "tabular-nums" : ""}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        children
      )}
    </div>
  );
}
