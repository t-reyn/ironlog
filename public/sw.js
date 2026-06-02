// Minimal service worker — handles the update lifecycle only, no caching.
// Caching is left to the browser/CDN; this just enables the "tap to update" banner.

self.addEventListener("install", () => {
  // Stay in waiting state until the user taps "Update" (or there's no active SW yet).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
