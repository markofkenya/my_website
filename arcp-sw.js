// ── ARCP Tracker Service Worker ──────────────────────
// Strategy: cache-first for speed, background revalidate
// On new version detected → skip waiting → clients reload

const CACHE_NAME = “arcp-tracker-v1”;
const ASSETS = [
“./arcp-tracker.html”,
“https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap”,
];

// ── Install: cache core assets ────────────────────────
self.addEventListener(“install”, event => {
event.waitUntil(
caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
);
// Take over immediately — don’t wait for old SW to finish
self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────
self.addEventListener(“activate”, event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(
keys
.filter(k => k !== CACHE_NAME)
.map(k => caches.delete(k))
)
)
);
// Take control of all open clients immediately
self.clients.claim();
});

// ── Fetch: stale-while-revalidate ────────────────────
self.addEventListener(“fetch”, event => {
// Only handle GET requests for same-origin or CDN assets
if (event.request.method !== “GET”) return;

event.respondWith(
caches.open(CACHE_NAME).then(async cache => {
const cached = await cache.match(event.request);

```
  // Fetch from network in background
  const networkFetch = fetch(event.request)
    .then(response => {
      if (response && response.status === 200 && response.type !== "opaque") {
        cache.put(event.request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available, else wait for network
  return cached || networkFetch;
})
```

);
});

// ── Message: force update from app ───────────────────
self.addEventListener(“message”, event => {
if (event.data === “skipWaiting”) {
self.skipWaiting();
}
});
