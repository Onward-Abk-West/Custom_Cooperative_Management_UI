"use client";

import { useEffect, useState } from "react";

/** Chrome's non-standard install event; not in lib.dom.d.ts. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install app" button. Chrome on Android fires `beforeinstallprompt`
 * once the manifest + service worker pass its installability checks; we
 * hold the event and let the user trigger the native install dialog
 * from our own button instead of (only) Chrome's mini-infobar.
 *
 * Renders nothing when the browser doesn't offer installation (desktop
 * Safari, Firefox, iOS — where installing is Share → Add to Home
 * Screen and cannot be triggered from a page), when the app is already
 * running installed, or after the user installs it.
 */
export function InstallPrompt({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    // The event can only be used once, whatever the user chose.
    setDeferred(null);
  }

  return (
    <button
      type="button"
      onClick={install}
      className={`inline-flex items-center gap-1.5 rounded-full border border-brand-green/40 bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green transition hover:bg-brand-green/20 ${className}`}
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
  );
}
