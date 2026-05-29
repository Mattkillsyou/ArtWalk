// Lincoln Heights Studio Map service worker.
// Strategy:
//  - The app shell (index.html + map images) is precached on install so the
//    map loads with no signal once the user has opened the app once.
//  - Artist images (breweryartwalk.com/wp-content/...) use cache-first with
//    network fallback so once you've opened an artist their photos stay
//    available offline.
//  - Everything else falls through to the network.

const CACHE = 'studiomap-shell-v1';
const SHELL = [
  './',
  './index.html',
  './bw map.jpg',
  './map_greyscale.jpg',
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

  // Artist images on breweryartwalk.com — cache-first, persist on first hit.
  if (url.hostname.endsWith('breweryartwalk.com')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        }).catch(() => cached || new Response('', { status: 504, statusText: 'offline' }));
      })
    );
    return;
  }

  // Anything else (Google Fonts, etc.) — pass-through with cache fallback.
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
