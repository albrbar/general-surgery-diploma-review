// Offline support for the installable GS Midterm app (scope: /midterm/).
const CACHE = 'gs-midterm-v2';
const SHELL = ['./', './index.html', './app.js', './app.css', './pool.json', './lecture-links.json', './manifest.webmanifest', '../icons/icon-192.png', '../icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('gs-midterm-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first (fresh questions when online), cache fallback when offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
