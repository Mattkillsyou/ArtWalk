// Lincoln Heights Studio Map service worker.
// Strategy:
//  - The app shell (index.html) is precached on install so the map loads with
//    no signal once the user has opened it once. All data is inlined in
//    index.html and the map is drawn in-app — there are no remote assets.
//  - Same-origin requests are cache-first; everything else passes through to
//    the network with a cache fallback.

const CACHE = 'studiomap-shell-v1';
const SHELL = [
  './',
  './index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(SHELL).catch(() => {/* tolerate missing optional files */})
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin shell or local assets — cache-first, fall back to network.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          // Stash a copy for next time if it's a successful basic response.
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  // Anything else — pass-through with cache fallback.
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
