// ArtWalk LA service worker.
// Strategy:
//  - The shell document (index.html) is NETWORK-FIRST when online, so a returning
//    PWA user always gets the latest build; it falls back to cache when offline.
//  - Other same-origin assets (icons, font, manifest) are cache-first.
//  - CACHE is stamped with a content hash by prepare.js (`__SW_VERSION__`), so
//    every release invalidates the previous cache automatically.
//  - On iOS/Capacitor the SW is skipped (the bundle ships on-device); this only
//    serves the GitHub Pages / web PWA path.

const CACHE = 'artwalk-shell-__SW_VERSION__';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './fonts/inter-tight.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))   // tolerate any optional miss
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin → network, cache fallback.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Shell document → network-first so an online user always gets a fresh build;
  // fall back to the cached shell when offline.
  const isDoc = req.mode === 'navigate'
    || url.pathname === '/' || url.pathname.endsWith('/')
    || url.pathname.endsWith('/index.html');
  if (isDoc) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Other same-origin assets → cache-first, then network (and stash a copy).
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached)
    )
  );
});
