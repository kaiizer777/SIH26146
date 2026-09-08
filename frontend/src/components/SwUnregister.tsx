"use client";

import { useEffect } from "react";

/**
 * Unregisters all service workers on mount.
 *
 * Root cause: a stale SW from a previously-served app (uploadthing / PWA)
 * was cached in the browser under localhost:3000 and was intercepting all
 * fetch requests with its own Content-Security-Policy that excluded
 * `localhost:8000`, blocking every API call.
 *
 * This runs once per page load and is a no-op if no SWs are registered.
 */
export default function SwUnregister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().then((success) => {
          if (success && process.env.NODE_ENV === "development") {
            console.info("[SwUnregister] Unregistered stale service worker:", reg.scope);
          }
        });
      }
    });
  }, []);

  return null;
}
