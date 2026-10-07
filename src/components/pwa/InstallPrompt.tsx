"use client";

import { useEffect, useRef, useState } from "react";

/** Chrome's non-standard install event; not in lib.dom.d.ts. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type IosMode = "safari" | "other-browser";

/**
 * Returns how to guide an iPhone/iPad visitor, or null when this isn't
 * iOS or the app is already running from the Home Screen. iOS cannot
 * trigger installation from a page (no `beforeinstallprompt`), so the
 * best we can do is show the Share → Add to Home Screen steps.
 */
function detectIosMode(): IosMode | null {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; touch points tell them apart.
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIos) return null;

  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (standalone) return null;

  // Chrome / Firefox / Edge / Opera / DuckDuckGo on iOS identify with
  // these tokens. Their Add-to-Home-Screen support varies by iOS
  // version, so we point people to Safari, where it is reliable.
  return /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua) ? "other-browser" : "safari";
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      fill="none"
      aria-hidden="true"
      className="inline-block shrink-0 align-text-bottom"
    >
      <path
        d="M8 10V2M8 2 5.5 4.5M8 2l2.5 2.5M4.5 7H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-.5"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * "Install app" button.
 *
 *  - Android (Chrome): `beforeinstallprompt` fires once the manifest +
 *    service worker pass installability checks; we hold the event and
 *    run the native install dialog from this button.
 *  - iPhone/iPad: no such event exists, so the same button opens a small
 *    panel with the Share → Add to Home Screen steps instead.
 *
 * Renders nothing anywhere else (desktop Safari/Firefox, an
 * already-installed app, after install, or before detection runs).
 *
 * `popoverAlign` says which edge of the button the iOS panel lines up
 * with, so it never runs off-screen when the button sits at the right
 * edge of the mobile header.
 */
export function InstallPrompt({
  className = "",
  popoverAlign = "left",
}: {
  className?: string;
  popoverAlign?: "left" | "right";
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosMode, setIosMode] = useState<IosMode | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detection touches navigator/window, so it runs after mount to
    // keep server and first client render identical (both render null).
    setIosMode(detectIosMode());

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
      setIosMode(null);
      setOpen(false);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Close the iOS panel on outside tap or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!deferred && !iosMode) return null;

  async function onClick() {
    if (deferred) {
      await deferred.prompt();
      // The event can only be used once, whatever the user chose.
      setDeferred(null);
      return;
    }
    setOpen((value) => !value);
  }

  return (
    <div className={className}>
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={deferred ? undefined : open}
        aria-haspopup={deferred ? undefined : "dialog"}
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/40 bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green transition hover:bg-brand-green/20"
      >
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" aria-hidden="true">
          <path
            d="M8 2v8M8 10 5 7M8 10l3-3M3 13h10"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Install app
      </button>

      {open && iosMode ? (
        <div
          role="dialog"
          aria-label="Install on iPhone"
          className={`absolute top-full z-50 mt-2 w-64 rounded-2xl border border-brand-line bg-brand-cream p-4 text-left text-xs leading-relaxed text-brand-ink shadow-xl ${
            popoverAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="font-heading text-sm font-bold text-heading">
            Install on iPhone
          </p>
          {iosMode === "safari" ? (
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>
                Tap the Share button <ShareIcon /> in Safari&rsquo;s toolbar.
              </li>
              <li>
                Choose <span className="font-semibold">Add to Home Screen</span>.
              </li>
              <li>
                Tap <span className="font-semibold">Add</span>. Onward opens from
                your Home Screen like an app.
              </li>
            </ol>
          ) : (
            <p className="mt-2">
              Open this page in <span className="font-semibold">Safari</span>, then
              tap Share <ShareIcon /> and{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-brand-cream transition hover:bg-brand-green-dark"
          >
            Got it
          </button>
        </div>
      ) : null}
    </div>
    </div>
  );
}
