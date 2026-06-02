// Serves /sw.js with a per-deploy version stamp so the browser detects a new
// service worker on every release (a static file would be byte-identical across
// deploys and never trigger the "Update available" banner). Computed at build
// time via force-static.
export const dynamic = "force-static";

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

export function GET() {
  const body = `// version: ${VERSION}
// Minimal service worker — handles the update lifecycle only, no caching.
self.addEventListener("install", () => {
  // Stay in waiting state until the user taps "Update".
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
