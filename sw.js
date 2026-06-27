const CACHE_NAME = 'clientflow-cache-v3';
const urlsToCache = [
  './index.html',
  './manifest.json',
  'https://iili.io/CAc9hEG.png',
  'https://iili.io/CAcJQX1.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
