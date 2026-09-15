const CACHE = 'squadron2-v4';
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.json', '/offline.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // never intercept proxy requests — always go to network
  if (url.pathname.startsWith('/proxy')) return;

  e.respondWith(
    fetch(e.request)
      .catch(() => caches.match(e.request)
        .then(cached => cached || caches.match('/offline.html'))
      )
  );
});
