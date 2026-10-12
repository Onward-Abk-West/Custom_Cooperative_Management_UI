"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Money } from "@/components/money/MoneyPopup";
import { Avatar } from "./Avatar";
import { MemberCard } from "./MemberCard";
import { ChevronRightIcon, ReceiptIcon } from "./MemberIcons";
import type { FinancialCategory } from "@/lib/api/financial-transactions";
import {
  allEntries,
  formatEntryDate,
  getMemberRecords,
  groupEntries,
  groupEntryCount,
  groupRecords,
  groupTotal,
  isInvalidDateRange,
  transactionHistory,
  totalOf,
  type RecordGroup,
  type RecordGroupId,
} from "@/lib/member-records";

/** Gap between cards in the swipe track, in px (matches gap-3). */
const GAP = 12;
/** Transactions shown before "Show all". */
const PREVIEW_COUNT = 12;

const GROUP_BACKGROUND: Record<RecordGroupId, string> = {
  shares: "linear-gradient(135deg, #17356b 0%, #2a69b3 100%)",
  savings: "linear-gradient(135deg, #0f4f31 0%, #176b42 62%, #1f8a55 100%)",
  loans: "linear-gradient(135deg, #7a1c1c 0%, #c62828 100%)",
  other: "linear-gradient(135deg, #5c430a 0%, #8f6a12 100%)",
};

/** What the transactions list is showing. */
type Scope =
  | { kind: "all" }
  | { kind: "group"; id: RecordGroupId }
  | { kind: "category"; id: RecordGroupId; category: FinancialCategory };

function lastEntryDate(dates: string[]): string | null {
  return dates.length ? [...dates].sort().reverse()[0] : null;
}

/**
 * One card per kind of record (Shares, Savings, Loans, Other), styled as
 * a bank card: the kind, what has been recorded under it in total, and
 * who it belongs to. A card holding more than one category (Savings has
 * up to six, Loans up to six) expands downwards on tap to list each one
 * with its own total; tapping a category there narrows the transactions
 * below the cards to just that category. Colours are fixed (not theme
 * tokens) so the white text keeps its contrast in light and dark mode.
 *
 * On phones the cards are a swipeable row (w-[86%] each, the next one
 * peeking); from `md` up they sit in a grid and the selected one gets a
 * ring instead.
 */
function RecordCard({
  group,
  holder,
  holderPictureUrl,
  selected,
  expanded,
  selectedCategory,
  onTap,
  onSelectCategory,
}: {
  group: RecordGroup;
  holder: string;
  holderPictureUrl?: string | null;
  selected: boolean;
  expanded: boolean;
  selectedCategory: FinancialCategory | null;
  onTap: () => void;
  onSelectCategory: (category: FinancialCategory | null) => void;
}) {
  const multi = group.categories.length > 1;
  const entryCount = groupEntryCount(group);
  const last = lastEntryDate(group.categories.flatMap((c) => c.entries.map((e) => e.date)));
  const panelId = `record-breakdown-${group.id}`;

  return (
    <div
      onClick={(e) => {
        // Taps on the amount popup or a category row are handled there.
        if ((e.target as HTMLElement).closest("button, a")) return;
        onTap();
      }}
      className={`relative flex min-h-[11.5rem] w-[86%] shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-3xl p-5 text-white shadow-md transition-shadow md:w-auto md:shrink md:ring-offset-2 md:ring-offset-brand-cream ${
        selected ? "md:ring-2 md:ring-brand-gold" : ""
      }`}
      style={{ background: GROUP_BACKGROUND[group.id] }}
    >
      {/* Soft decorative rings, the same device bank cards use. */}
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-white/[0.07]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{group.label}</p>
          <p className="text-xs text-white/75">Total recorded</p>
        </div>
        {multi ? (
          <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
            {group.categories.length} records
          </span>
        ) : null}
      </div>

      <p className="relative mt-3 break-words text-[1.7rem] font-bold leading-tight tabular-nums">
        <Money value={groupTotal(group)} label={`${group.label} total`} onDark />
      </p>

      <div className="relative mt-4 flex items-end justify-between gap-3 text-xs text-white/80">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar pictureUrl={holderPictureUrl} name={holder} size="sm" onDark />
          <span className="min-w-0 truncate font-semibold text-white">{holder}</span>
        </span>
        {multi ? (
          <button
            type="button"
            onClick={onTap}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold text-white outline-none transition hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {expanded ? "Hide" : "Show"} records
            <ChevronRightIcon
              className={`h-3.5 w-3.5 transition-transform duration-300 ${
                expanded ? "-rotate-90" : "rotate-90"
              }`}
            />
          </button>
        ) : (
          <span className="shrink-0 text-right">
            {entryCount} {entryCount === 1 ? "entry" : "entries"}
            {last ? ` · last ${formatEntryDate(last)}` : ""}
          </span>
        )}
      </div>

      {multi ? (
        <div
          id={panelId}
          // Rows are only focusable / readable while the card is open.
          inert={!expanded}
          aria-hidden={!expanded}
          className={`relative grid transition-[grid-template-rows] duration-300 ease-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <ul role="list" className="mt-4 flex flex-col gap-1 border-t border-white/25 pt-3">
              {group.categories.map((c) => {
                const isSelected = selectedCategory === c.category;
                const lastDate = lastEntryDate(c.entries.map((e) => e.date));
                return (
                  <li
                    key={c.category}
                    className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors ${
                      isSelected ? "bg-white/20" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectCategory(isSelected ? null : c.category)}
                      aria-pressed={isSelected}
                      className="min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      <span className="block truncate text-sm font-semibold">{c.category}</span>
                      <span className="block truncate text-[11px] text-white/70">
                        {c.entries.length} {c.entries.length === 1 ? "entry" : "entries"}
                        {lastDate ? ` · last ${formatEntryDate(lastDate)}` : ""}
                      </span>
                    </button>
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      <Money value={totalOf(c)} label={c.category} onDark />
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-white/70">
              Tap a record to see only its transactions below.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const DATE_INPUT_CLASS =
  "w-full rounded-xl border border-brand-line bg-surface-card px-3 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30";

/**
 * A member's financial records: a drop-down to pick a record, the cards
 * (a swipeable row on phones, a grid from `md` up, each expandable into
 * its categories), and the transactions list underneath. The list covers
 * everything by default and narrows to a card or one category when one
 * is picked; a From / To date filter narrows it further. Used on the
 * member's own dashboard and on the member detail page an officer
 * opens, so both see the same thing.
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
  const groups = useMemo(() => groupRecords(getMemberRecords()), []);
  const [active, setActive] = useState(0);
  const [scope, setScope] = useState<Scope>({ kind: "all" });
  const [expandedIds, setExpandedIds] = useState<RecordGroupId[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showAllFor, setShowAllFor] = useState<string | null>(null);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(0);
  // While a programmatic scroll (drop-down / arrows / dots) is running,
  // ignore scroll events so the selection doesn't flicker through every
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
    if (idx === activeRef.current) return;
    activeRef.current = idx;
    setActive(idx);
    setScope({ kind: "group", id: groups[idx].id });
  }, [groups, step]);

  const goTo = useCallback(
    (index: number, opts?: { category?: FinancialCategory; expand?: boolean }) => {
      const clamped = Math.min(groups.length - 1, Math.max(0, index));
      const group = groups[clamped];
      const el = trackRef.current;
      if (el && clamped !== activeRef.current) {
        programmaticUntil.current = Date.now() + 600;
        el.scrollTo({ left: clamped * step(), behavior: "smooth" });
      }
      activeRef.current = clamped;
      setActive(clamped);
      setScope(
        opts?.category
          ? { kind: "category", id: group.id, category: opts.category }
          : { kind: "group", id: group.id }
      );
      if (opts?.expand) {
        setExpandedIds((ids) => (ids.includes(group.id) ? ids : [...ids, group.id]));
      }
    },
    [groups, step]
  );

  const scopeGroup = scope.kind === "all" ? undefined : groups.find((g) => g.id === scope.id);
  const scopeCategory = scope.kind === "category" ? scope.category : null;
  const mixed = scope.kind === "all";

  const entries = useMemo(
    () => (scopeGroup ? groupEntries(scopeGroup, scopeCategory) : allEntries(groups)),
    [groups, scopeGroup, scopeCategory]
  );
  const rangeInvalid = isInvalidDateRange(from, to);
  const filterKey = `${scope.kind}|${scopeGroup?.id ?? ""}|${scopeCategory ?? ""}|${from}|${to}`;
  const showAll = showAllFor === filterKey;
  const dateFiltered = Boolean(from || to);

  const inRange = useMemo(
    () =>
      rangeInvalid
        ? []
        : entries.filter((e) => (!from || e.date >= from) && (!to || e.date <= to)),
    [entries, from, to, rangeInvalid]
  );
  const rangeTotal = inRange.reduce((sum, e) => sum + e.amount, 0);
  const history = rangeInvalid
    ? []
    : transactionHistory({ entries }, { from, to, limit: showAll ? undefined : PREVIEW_COUNT });

  const scopeLabel = scopeCategory ?? scopeGroup?.label ?? "All records";
  const title = mixed ? "Transactions" : `${scopeLabel} transactions`;
  const selectValue =
    scope.kind === "all" ? "all" : scope.kind === "group" ? `g:${scope.id}` : `c:${scope.category}`;

  function handleSelect(value: string) {
    if (value === "all") {
      setScope({ kind: "all" });
      return;
    }
    const sep = value.indexOf(":");
    const kind = value.slice(0, sep);
    const rest = value.slice(sep + 1);
    if (kind === "g") {
      goTo(groups.findIndex((g) => g.id === rest));
    } else {
      const idx = groups.findIndex((g) => g.categories.some((c) => c.category === rest));
      goTo(idx, { category: rest as FinancialCategory, expand: true });
    }
  }

  function toggleExpanded(id: RecordGroupId) {
    setExpandedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-brand-ink/60">
        Figures shown are sample data — {forOfficer ? "this member's" : "your own"} recorded amounts
        will appear here once the system can return them.
      </p>

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">
          No financial records have been recorded {forOfficer ? "for this member" : "for you"} yet.
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1.5 md:max-w-sm">
            <span className="text-xs font-bold uppercase tracking-wide text-label">
              Financial record
            </span>
            <select
              value={selectValue}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full rounded-2xl border border-brand-line bg-surface-card px-4 py-3 text-sm font-semibold text-brand-ink outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
            >
              <option value="all">All records</option>
              {groups.map((g) =>
                g.categories.length > 1 ? (
                  <optgroup key={g.id} label={g.label}>
                    <option value={`g:${g.id}`}>
                      {g.id === "other" ? "All other records" : `All ${g.label.toLowerCase()}`}
                    </option>
                    {g.categories.map((c) => (
                      <option key={c.category} value={`c:${c.category}`}>
                        {c.category}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={g.id} value={`g:${g.id}`}>
                    {g.categories[0].category}
                  </option>
                )
              )}
            </select>
          </label>

          <div>
            <div
              ref={trackRef}
              onScroll={handleScroll}
              role="region"
              aria-label="Financial records — swipe to see the next one"
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
              className="-mx-4 flex snap-x snap-mandatory scroll-pl-4 items-start gap-3 overflow-x-auto scroll-smooth px-4 pb-1 outline-none [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-3 md:py-3 [&::-webkit-scrollbar]:hidden"
            >
              {groups.map((g, i) => (
                <RecordCard
                  key={g.id}
                  group={g}
                  holder={holder}
                  holderPictureUrl={holderPictureUrl}
                  selected={scope.kind !== "all" && scope.id === g.id}
                  expanded={expandedIds.includes(g.id)}
                  selectedCategory={scope.kind === "category" && scope.id === g.id ? scope.category : null}
                  onTap={() => {
                    const isSelected = scope.kind !== "all" && scope.id === g.id;
                    if (!isSelected) goTo(i, { expand: g.categories.length > 1 });
                    else if (g.categories.length > 1) toggleExpanded(g.id);
                  }}
                  onSelectCategory={(category) =>
                    category ? goTo(i, { category }) : goTo(i)
                  }
                />
              ))}
              {/* Trailing space so the last card can snap to the left edge. */}
              <div aria-hidden className="w-[14%] shrink-0 md:hidden" />
            </div>

            <div className="mt-3 flex items-center justify-center gap-3 md:hidden">
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
                    key={g.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Show ${g.label}`}
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

          <MemberCard
            icon={<ReceiptIcon className="h-6 w-6" />}
            title={title}
            subtitle={`${inRange.length} ${inRange.length === 1 ? "transaction" : "transactions"}${
              dateFiltered ? " in this date range" : ""
            } · newest first`}
            right={
              mixed ? undefined : (
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-label">
                    {dateFiltered ? "In range" : "Total"}
                  </p>
                  <Money
                    value={dateFiltered ? rangeTotal : entries.reduce((s, e) => s + e.amount, 0)}
                    label={`${scopeLabel} total`}
                    className="text-sm font-bold text-brand-ink"
                  />
                </div>
              )
            }
          >
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-end gap-3">
                <label htmlFor="txn-from" className="flex min-w-[8.5rem] flex-1 flex-col gap-1 md:max-w-[12rem]">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-label">From</span>
                  <input
                    id="txn-from"
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => setFrom(e.target.value)}
                    className={DATE_INPUT_CLASS}
                  />
                </label>
                <label htmlFor="txn-to" className="flex min-w-[8.5rem] flex-1 flex-col gap-1 md:max-w-[12rem]">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-label">To</span>
                  <input
                    id="txn-to"
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => setTo(e.target.value)}
                    className={DATE_INPUT_CLASS}
                  />
                </label>
                {dateFiltered ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFrom("");
                      setTo("");
                    }}
                    className="rounded-xl border border-brand-line px-3 py-2 text-sm font-semibold text-brand-ink/80 transition hover:bg-brand-line/30"
                  >
                    Clear dates
                  </button>
                ) : null}
              </div>
              {rangeInvalid ? (
                <p role="alert" className="text-xs font-semibold text-status-bad">
                  The From date is after the To date — adjust one of them.
                </p>
              ) : null}
              {scopeCategory && scopeGroup && scopeGroup.categories.length > 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(groups.findIndex((g) => g.id === scopeGroup.id))}
                  className="w-full rounded-xl bg-brand-line/25 px-3 py-2 text-left text-xs font-semibold text-brand-ink/80 transition hover:bg-brand-line/40"
                >
                  Showing {scopeCategory} only · Show all {scopeGroup.label.toLowerCase()}
                </button>
              ) : null}
            </div>

            {history.length === 0 && !rangeInvalid ? (
              <p className="rounded-2xl border border-dashed border-brand-line px-4 py-6 text-center text-sm text-brand-ink/60">
                {dateFiltered
                  ? "No transactions were recorded in this date range."
                  : "No transactions have been recorded yet."}
              </p>
            ) : null}

            {history.map((month) => (
              <section key={month.key} aria-label={month.label} className="mt-1 first:mt-0">
                <div className="sticky top-0 flex items-center justify-between gap-3 rounded-xl bg-brand-line/25 px-3 py-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-heading">
                    {month.label}
                  </h3>
                  {mixed ? null : (
                    <span className="text-xs text-brand-ink/60">
                      <Money
                        value={month.total}
                        label={`${month.label} total`}
                        className="font-semibold text-brand-ink/80"
                      />
                    </span>
                  )}
                </div>
                <ul role="list">
                  {month.rows.map((row) => (
                    <li
                      key={`${row.category}-${row.id}`}
                      className="flex items-start justify-between gap-3 border-t border-brand-line/70 py-3 first:border-t-0 md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-ink">
                          {formatEntryDate(row.date)}
                        </p>
                        <p className="truncate text-xs text-brand-ink/55">
                          {row.category}
                          {row.recordedBy ? ` · recorded by ${row.recordedBy}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right md:flex md:items-center md:gap-8">
                        <Money
                          value={row.amount}
                          label={row.category ?? scopeLabel}
                          className="text-sm font-bold text-brand-ink"
                        />
                        {mixed ? null : (
                          <p className="mt-0.5 text-xs text-brand-ink/55 md:mt-0 md:w-40">
                            Total{" "}
                            <Money
                              value={row.runningTotal}
                              label={`${scopeLabel} total after this entry`}
                              className="font-medium"
                            />
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {inRange.length > PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAllFor(showAll ? null : filterKey)}
                className="mt-3 w-full rounded-2xl border border-brand-line py-2.5 text-sm font-semibold text-brand-ink/80 transition hover:bg-brand-line/30"
              >
                {showAll ? "Show fewer" : `Show all ${inRange.length} transactions`}
              </button>
            ) : null}
          </MemberCard>
        </>
      )}
    </div>
  );
}
