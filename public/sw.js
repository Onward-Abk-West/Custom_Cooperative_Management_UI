/*
 * Onward Abeokuta-West service worker.
 *
 * Deliberately minimal. This app shows live, per-user financial records
 * behind a session cookie, so the worker NEVER caches pages, API
 * responses or any authenticated content — a stale or another user's
 * balance served from a cache would be worse than being offline. Its
 * jobs are:
 *   1. satisfy Chrome's installability checks (a fetch handler), and
 *   2. show a small branded "you're offline" page when a navigation
 *      fails because the device has no connection.
 *
 * Bump CACHE_VERSION when offline.html or the icon changes.
 */
const CACHE_VERSION = "onward-offline-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only top-level page navigations get the offline fallback; every
  // other request (API calls, scripts, images, non-GET) goes straight
  // to the network untouched.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() =>
      caches
        .open(CACHE_VERSION)
        .then((cache) => cache.match(OFFLINE_URL))
        .then((cached) => cached || Response.error())
    )
  );
});
