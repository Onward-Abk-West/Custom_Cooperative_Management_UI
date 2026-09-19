"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "onward-theme";

/**
 * Sun theme / night theme switch.
 *
 * The token swap itself lives in globals.css, keyed off the
 * data-theme attribute on <html> — this component only flips that
 * attribute (and the OS-preference fallback CSS already handles the
 * case where the visitor hasn't chosen). The no-flash initial value
 * on load is set by the inline script in the root layout, before
 * React hydrates.
 *
 * Reading current theme via useSyncExternalStore (rather than
 * useState+useEffect) because the source of truth — the DOM
 * attribute and the OS media query — lives outside React entirely;
 * this is exactly what the hook is for, and it resolves the
 * server/client mismatch (server has no data-theme, client may
 * already have one) without a manual "loading" placeholder render.
 */
function readTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
  });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

// The server has no data-theme attribute and doesn't know the OS
// preference, so it always renders as if light; useSyncExternalStore
// reconciles this against the real client value right after hydration.
function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing / blocked storage — the toggle still works for
    // this page load, it just won't be remembered next visit.
  }
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to sun theme" : "Switch to night theme"}
      title={isDark ? "Sun theme" : "Night theme"}
      className={`glass-chip inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-gold-dark transition hover:border-brand-gold ${className}`}
    >
      {isDark ? (
        // Moon — currently on night theme; click for sun theme.
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M20.354 15.354A9 9 0 0 1 8.646 3.646a.75.75 0 0 0-.937-1.037A10.5 10.5 0 1 0 21.39 16.29a.75.75 0 0 0-1.037-.937Z" />
        </svg>
      ) : (
        // Sun — currently on sun theme; click for night theme.
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 4.75a.75.75 0 0 1 .75.75V7a.75.75 0 0 1-1.5 0V5.5a.75.75 0 0 1 .75-.75Zm0 12.5a.75.75 0 0 1 .75.75V19.5a.75.75 0 0 1-1.5 0V18a.75.75 0 0 1 .75-.75ZM4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm1.75-6.47a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06L5.75 6.59a.75.75 0 0 1 0-1.06Zm10.4 10.4a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM19.25 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H20a.75.75 0 0 1-.75-.75ZM4.5 12a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm12.7-6.87a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Zm-10.4 10.4a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Z" />
        </svg>
      )}
      <span className="sr-only">
        {isDark ? "Switch to sun theme" : "Switch to night theme"}
      </span>
    </button>
  );
}
