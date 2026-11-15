"use client";

import { useEffect } from "react";

/**
 * In development PWA is disabled, so no /sw.js is generated. A service worker
 * left over from a previous production build keeps re-requesting it (404).
 * This unregisters stale workers and clears their caches in dev only.
 */
export default function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });

    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }, []);

  return null;
}
