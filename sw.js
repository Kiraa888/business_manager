const CACHE_NAME = 'clientflow-cache-v3'; // Bumped version to v3
const urlsToCache = [
  './',              // Added root path
  './index.html',
  './style.css',    // Your new CSS file
  './app.js',       // Your new JS file
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

// Optional but highly recommended: Add an activation event to clear out old v2 caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
