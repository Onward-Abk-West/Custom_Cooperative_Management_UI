"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js so the app is installable on Android. Production
 * only: in `next dev` a service worker adds nothing and makes stale-
 * asset debugging confusing. Renders nothing.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration failure only costs installability / the offline
      // page — never worth surfacing to the user.
    });
  }, []);

  return null;
}
