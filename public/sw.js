/* MGMT6110 Exam Prep Quiz — service worker (v4, Nov 2026).
   - Content JSON (/content/*): network-first with a no-cache fetch, so new questions are never stale;
     the cached copy is used only when offline.
   - Pages: network-first, cached index.html when offline.
   - Hashed assets (/assets/*) and icons: cache-first.
   - skipWaiting + clients.claim: a new deploy takes over at once; the page shows a refresh toast. */
const VERSION = 'mgmt6110-quiz-v6-2026-11-05-bank3-scrollfix';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

function networkFirst(req, cacheKey) {
  // A navigation Request cannot be re-created with options, so only content fetches get cache: 'no-cache'.
  const p = req.mode === 'navigate' ? fetch(req) : fetch(req, { cache: 'no-cache' });
  return p.then((res) => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(cacheKey || req, copy)).catch(() => {});
    }
    return res;
  }).catch(() => caches.match(cacheKey || req).then((hit) => hit || Response.error()));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/content/')) {
    e.respondWith(networkFirst(req));
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, '/index.html'));
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
