"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Money } from "@/components/money/MoneyPopup";
import { Avatar } from "./Avatar";
import { MemberCard } from "./MemberCard";
import { ChevronRightIcon, ReceiptIcon } from "./MemberIcons";
import {
  entriesNewestFirst,
  formatEntryDate,
  transactionHistory,
  getMemberRecords,
  recordKind,
  totalOf,
  type MemberRecordGroup,
  type RecordKind,
} from "@/lib/member-records";

/** Gap between cards in the swipe track, in px (matches gap-3). */
const GAP = 12;
/** Entries shown before "Show all". */
const PREVIEW_COUNT = 12;

const KIND_STYLE: Record<RecordKind, { background: string; label: string }> = {
  savings: {
    background: "linear-gradient(135deg, #0f4f31 0%, #176b42 62%, #1f8a55 100%)",
    label: "Savings",
  },
  shares: {
    background: "linear-gradient(135deg, #17356b 0%, #2a69b3 100%)",
    label: "Shares",
  },
  loan: {
    background: "linear-gradient(135deg, #7a1c1c 0%, #c62828 100%)",
    label: "Loan",
  },
};

/**
 * One record as a bank-card-style tile: the category, what has been
 * recorded under it in total, and who it belongs to. Colours are fixed
 * (not theme tokens) so the white text keeps its contrast in both
 * light and dark mode.
 */
function RecordCard({
  group,
  holder,
  holderPictureUrl,
}: {
  group: MemberRecordGroup;
  holder: string;
  holderPictureUrl?: string | null;
}) {
  const kind = recordKind(group.category);
  const style = KIND_STYLE[kind];
  const entries = entriesNewestFirst(group);
  const last = entries[0];

  return (
    <div
      className="relative flex min-h-[11.5rem] w-[86%] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-3xl p-5 text-white shadow-md"
      style={{ background: style.background }}
    >
      {/* Soft decorative rings, the same device bank cards use. */}
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-white/[0.07]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{group.category}</p>
          <p className="text-xs text-white/75">Total recorded</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
          {style.label}
        </span>
      </div>

      <p className="relative mt-3 break-words text-[1.7rem] font-bold leading-tight tabular-nums">
        <Money value={totalOf(group)} label={group.category} onDark />
      </p>

      <div className="relative mt-4 flex items-end justify-between gap-3 text-xs text-white/80">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar pictureUrl={holderPictureUrl} name={holder} size="sm" onDark />
          <span className="min-w-0 truncate font-semibold text-white">{holder}</span>
        </span>
        <span className="shrink-0 text-right">
          {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
          {last ? ` · last ${formatEntryDate(last.date)}` : ""}
        </span>
      </div>
    </div>
  );
}

/**
 * A member's financial records: a drop-down to pick a record, one
 * swipeable card per record, and the entries recorded under the card
 * showing. Used on the member's own dashboard and on the member detail
 * page an officer opens, so both see the same thing.
 */
export function MemberRecordsViewer({
  holder,
  holderPictureUrl,
  forOfficer = false,
}: {
  holder: string;
  holderPictureUrl?: string | null;
  /** True on the page an officer opens for someone else's records. */
  forOfficer?: boolean;
}) {
  const groups = useMemo(() => getMemberRecords(), []);
  const [active, setActive] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  // While a programmatic scroll (drop-down / arrows / dots) is running,
  // ignore scroll events so `active` doesn't flicker through every
  // card on the way.
  const programmaticUntil = useRef(0);

  const step = useCallback(() => {
    const first = trackRef.current?.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + GAP : 0;
  }, []);

  const handleScroll = useCallback(() => {
    if (Date.now() < programmaticUntil.current) return;
    const el = trackRef.current;
    const s = step();
    if (!el || !s) return;
    const idx = Math.min(groups.length - 1, Math.max(0, Math.round(el.scrollLeft / s)));
    setActive((prev) => {
      if (prev !== idx) setShowAll(false);
      return idx;
    });
  }, [groups.length, step]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.min(groups.length - 1, Math.max(0, index));
      const el = trackRef.current;
      if (el) {
        programmaticUntil.current = Date.now() + 600;
        el.scrollTo({ left: clamped * step(), behavior: "smooth" });
      }
      setActive(clamped);
      setShowAll(false);
    },
    [groups.length, step]
  );

  const current = groups[active];
  const entryCount = current ? current.entries.length : 0;
  const history = current
    ? transactionHistory(current, showAll ? undefined : PREVIEW_COUNT)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-brand-ink/60">
        Figures shown are sample data — {forOfficer ? "this member's" : "your own"} recorded amounts
        will appear here once the system can return them.
      </p>

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No financial records have been recorded for you yet.
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-label">
              Financial record
            </span>
            <select
              value={active}
              onChange={(e) => goTo(Number(e.target.value))}
              className="w-full rounded-2xl border border-brand-line bg-surface-card px-4 py-3 text-sm font-semibold text-brand-ink outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
            >
              {groups.map((g, i) => (
                <option key={g.category} value={i}>
                  {g.category}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div
              ref={trackRef}
              onScroll={handleScroll}
              role="region"
              aria-label="Your financial records — swipe to see the next one"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  goTo(active + 1);
                }
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  goTo(active - 1);
                }
              }}
              className="-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-1 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {groups.map((g) => (
                <RecordCard key={g.category} group={g} holder={holder} holderPictureUrl={holderPictureUrl} />
              ))}
              {/* Trailing space so the last card can snap to the left edge. */}
              <div aria-hidden className="w-[14%] shrink-0" />
            </div>

            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goTo(active - 1)}
                disabled={active === 0}
                aria-label="Previous record"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-line text-brand-ink transition hover:bg-brand-line/40 disabled:opacity-30"
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180" />
              </button>
              <div className="flex items-center gap-1.5">
                {groups.map((g, i) => (
                  <button
                    key={g.category}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Show ${g.category}`}
                    aria-current={i === active ? "true" : undefined}
                    className={`h-2 rounded-full transition-all ${
                      i === active ? "w-6 bg-brand-green" : "w-2 bg-brand-ink/25"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => goTo(active + 1)}
                disabled={active === groups.length - 1}
                aria-label="Next record"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-line text-brand-ink transition hover:bg-brand-line/40 disabled:opacity-30"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {current ? (
            <MemberCard
              icon={<ReceiptIcon className="h-6 w-6" />}
              title={`${current.category} transaction history`}
              subtitle={`${entryCount} ${entryCount === 1 ? "transaction" : "transactions"} · newest first`}
              right={
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-label">Total</p>
                  <Money
                    value={totalOf(current)}
                    label={`${current.category} total`}
                    className="text-sm font-bold text-brand-ink"
                  />
                </div>
              }
            >
              {history.map((month) => (
                <section key={month.key} aria-label={month.label} className="mt-1 first:mt-0">
                  <div className="sticky top-0 flex items-center justify-between gap-3 rounded-xl bg-brand-line/25 px-3 py-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-heading">
                      {month.label}
                    </h3>
                    <span className="text-xs text-brand-ink/60">
                      <Money
                        value={month.total}
                        label={`${month.label} total`}
                        className="font-semibold text-brand-ink/80"
                      />
                    </span>
                  </div>
                  <ul role="list">
                    {month.rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-start justify-between gap-3 border-t border-brand-line/70 py-3 first:border-t-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-brand-ink">
                            {formatEntryDate(row.date)}
                          </p>
                          <p className="truncate text-xs text-brand-ink/55">
                            {current.category}
                            {row.recordedBy ? ` · recorded by ${row.recordedBy}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Money
                            value={row.amount}
                            label={current.category}
                            className="text-sm font-bold text-brand-ink"
                          />
                          <p className="mt-0.5 text-xs text-brand-ink/55">
                            Total{" "}
                            <Money
                              value={row.runningTotal}
                              label={`${current.category} total after this entry`}
                              className="font-medium"
                            />
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {entryCount > PREVIEW_COUNT ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-3 w-full rounded-2xl border border-brand-line py-2.5 text-sm font-semibold text-brand-ink/80 transition hover:bg-brand-line/30"
                >
                  {showAll ? "Show fewer" : `Show all ${entryCount} transactions`}
                </button>
              ) : null}
            </MemberCard>
          ) : null}
        </>
      )}
    </div>
  );
}
