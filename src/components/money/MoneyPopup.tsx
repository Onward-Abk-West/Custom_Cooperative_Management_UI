"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { formatNaira, formatNairaExact, nairaInWords } from "@/lib/money";

/**
 * One shared popup for every money figure in the app. Anything that
 * shows an amount — a <Money> button, a chart label, a table cell —
 * calls show(value, anchor) and the popup appears next to it with the
 * amount in Naira and in words. Closes on outside tap, Escape, scroll
 * or resize.
 */
interface ShowOptions {
  /** Optional caption above the amount, e.g. "Total savings". */
  label?: string;
}

interface MoneyPopupApi {
  show: (value: number, anchor: Element | DOMRect, options?: ShowOptions) => void;
  hide: () => void;
}

const noop: MoneyPopupApi = { show: () => {}, hide: () => {} };
const MoneyPopupContext = createContext<MoneyPopupApi>(noop);

export function useMoneyPopup(): MoneyPopupApi {
  return useContext(MoneyPopupContext);
}

interface OpenState {
  value: number;
  rect: DOMRect;
  label?: string;
}

const MARGIN = 8;
const GAP = 8;

export function MoneyPopupProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<OpenState | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrowLeft: number; above: boolean } | null>(null);

  const hide = useCallback(() => {
    setOpen(null);
    setPos(null);
  }, []);

  const show = useCallback((value: number, anchor: Element | DOMRect, options?: ShowOptions) => {
    const rect = anchor instanceof DOMRect ? anchor : anchor.getBoundingClientRect();
    setPos(null);
    setOpen({ value, rect, label: options?.label });
  }, []);

  // Place the popup once it has been measured: centred on the anchor,
  // clamped to the viewport, flipped above when there is no room below.
  useLayoutEffect(() => {
    if (!open || !popupRef.current) return;
    const { width, height } = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const anchorCentre = open.rect.left + open.rect.width / 2;
    const left = Math.min(Math.max(anchorCentre - width / 2, MARGIN), Math.max(vw - width - MARGIN, MARGIN));
    const below = open.rect.bottom + GAP;
    const above = below + height > vh - MARGIN && open.rect.top - GAP - height > MARGIN;
    const top = above ? open.rect.top - GAP - height : Math.min(below, Math.max(vh - height - MARGIN, MARGIN));
    const arrowLeft = Math.min(Math.max(anchorCentre - left, 18), Math.max(width - 18, 18));
    setPos({ left, top, arrowLeft, above });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") hide();
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (popupRef.current && target && popupRef.current.contains(target)) return;
      // A tap on another money trigger re-opens via its own handler.
      hide();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [open, hide]);

  const api = useMemo<MoneyPopupApi>(() => ({ show, hide }), [show, hide]);

  return (
    <MoneyPopupContext.Provider value={api}>
      {children}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popupRef}
              role="dialog"
              aria-label="Amount in words"
              style={{
                position: "fixed",
                left: pos?.left ?? 0,
                top: pos?.top ?? 0,
                visibility: pos ? "visible" : "hidden",
              }}
              className="z-[100] w-[min(20rem,calc(100vw-1rem))] rounded-2xl border border-brand-line bg-brand-cream p-4 text-brand-ink shadow-2xl"
            >
              {pos ? (
                <span
                  aria-hidden
                  style={{ left: pos.arrowLeft - 6 }}
                  className={`absolute h-3 w-3 rotate-45 border-brand-line bg-brand-cream ${
                    pos.above ? "-bottom-1.5 border-b border-r" : "-top-1.5 border-l border-t"
                  }`}
                />
              ) : null}
              {open.label ? (
                <p className="text-xs font-bold uppercase tracking-wide text-label">{open.label}</p>
              ) : null}
              <p className="mt-0.5 break-words text-2xl font-bold tabular-nums text-heading">
                {formatNairaExact(open.value)}
              </p>
              <p className="mt-2 text-sm leading-snug text-brand-ink">{nairaInWords(open.value)}</p>
              <p className="mt-3 border-t border-brand-line/70 pt-2 text-xs text-brand-ink/55">
                Nigerian Naira (NGN)
              </p>
            </div>,
            document.body
          )
        : null}
    </MoneyPopupContext.Provider>
  );
}

/**
 * A money figure that opens the popup when tapped or clicked.
 * Renders as an inline button styled like plain text so it drops into
 * cards and table cells without changing their look.
 */
export function Money({
  value,
  label,
  className = "",
  onDark = false,
}: {
  value: number;
  label?: string;
  className?: string;
  /** Use on a dark/coloured card: white dotted underline instead of ink. */
  onDark?: boolean;
}) {
  const { show } = useMoneyPopup();
  return (
    <button
      type="button"
      onClick={(e) => show(value, e.currentTarget, { label })}
      aria-haspopup="dialog"
      title="Tap to see this amount in words"
      className={`cursor-pointer rounded-md text-inherit underline decoration-dotted underline-offset-4 tabular-nums transition ${
        onDark
          ? "decoration-white/50 hover:decoration-white"
          : "decoration-brand-ink/30 hover:decoration-brand-ink/70"
      } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${className}`}
    >
      {formatNaira(value)}
    </button>
  );
}
