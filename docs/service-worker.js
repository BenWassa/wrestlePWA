const CACHE_VERSION = 'v9';
const CACHE_NAME = `wrestling-journey-${CACHE_VERSION}`;
const OFFLINE_RESOURCES = [
  './',
  './index.html',
  './style.css',
  './icon.svg',
  './manifest.json',
  './db.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_RESOURCES))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(request).then(response => response || fetch(request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});
