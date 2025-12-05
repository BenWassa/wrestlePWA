const CACHE_NAME = 'gemini-static-v2';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './tailwind.min.css',
  './js/app.js',
  './js/ui.js',
  './js/firebase.js',
  './js/storage.js',
  './manifest.json',
  './WrestleIcon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // don't cache POST etc.
  const url = new URL(event.request.url);
  // For API calls (firebase), prefer network (fastest) and fallback
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  // For local files, use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      // Optionally cache dynamic content
      if (event.request.destination === 'document' || event.request.destination === 'script' || event.request.destination === 'style') {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      }
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
