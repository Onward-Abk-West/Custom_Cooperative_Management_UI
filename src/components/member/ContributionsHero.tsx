"use client";

import { Amount } from "./Amount";
import { SampleBadge } from "./SampleBadge";
import {
  BROUGHT_FORWARD_2026,
  CURRENT_YEAR,
  monthsFunded,
  yearTotal,
} from "@/lib/member-sample-data";

/** Green summary card — total contributions, split, and months funded. */
export function ContributionsHero() {
  const paid = yearTotal(CURRENT_YEAR);
  const funded = monthsFunded(CURRENT_YEAR);
  return (
    <section className="rounded-3xl bg-brand-green p-5 text-brand-cream shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-75">
          Total contributions
        </p>
        <SampleBadge tone="onGreen" />
      </div>
      <p className="mt-2 text-4xl font-bold tracking-tight">
        <Amount value={BROUGHT_FORWARD_2026 + paid} />
      </p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
            Brought forward
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            <Amount value={BROUGHT_FORWARD_2026} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
            Paid in {CURRENT_YEAR}
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            <Amount value={paid} />
          </p>
        </div>
      </div>
      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-brand-cream/25"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={12}
        aria-valuenow={funded}
        aria-label={`${funded} of 12 months funded in ${CURRENT_YEAR}`}
      >
        <div className="h-full rounded-full bg-brand-cream" style={{ width: `${(funded / 12) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs opacity-85">
        {funded} of 12 months funded in {CURRENT_YEAR}
      </p>
    </section>
  );
}
