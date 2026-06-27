const CACHE_NAME = 'clientflow-cache-v3';
const FIREBASE_URLS = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js'
];

const urlsToCache = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://iili.io/CAc9hEG.png',
  'https://iili.io/CAcJQX1.png',
  ...FIREBASE_URLS
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Cache addAll error:', err))
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first for API calls, Cache first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Firebase API calls - Network first
  if (url.origin === 'https://firestore.googleapis.com' || 
      url.origin === 'https://identitytoolkit.googleapis.com' ||
      url.hostname.includes('firebaseapp.com')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
            return response;
          }
          return response;
        })
        .catch(() => {
          // Network error - try cache
          return caches.match(request)
            .then(response => response || new Response('Network error', { status: 503 }));
        })
    );
    return;
  }

  // Firebase SDK - Cache first
  if (url.hostname === 'www.gstatic.com') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then(response => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache);
              });
              return response;
            });
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Google Fonts - Cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then(response => {
              if (!response || response.status !== 200) {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache);
              });
              return response;
            });
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Images and static assets - Cache first
  if (request.destination === 'image' || 
      request.destination === 'font' || 
      request.destination === 'style' ||
      request.destination === 'script') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then(response => {
              if (!response || response.status !== 200) {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache);
              });
              return response;
            })
            .catch(() => {
              // Return placeholder for failed image requests
              if (request.destination === 'image') {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ddd" width="100" height="100"/></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
              return caches.match(request);
            });
        })
    );
    return;
  }

  // HTML documents - Network first for always fresh content
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
            return response;
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => response || caches.match('./index.html'));
        })
    );
    return;
  }

  // Default - Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then(response => response || new Response('Offline', { status: 503 }));
      })
  );
});

// Background Sync (for future offline support)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-leads') {
    event.waitUntil(
      // Future implementation for offline sync
      Promise.resolve()
    );
  }
});

// Push Notifications (for future alerts)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'ClientFlow Notification',
      icon: 'https://iili.io/CAc9hEG.png',
      badge: 'https://iili.io/CAc9hEG.png',
      tag: data.tag || 'clientflow-notification',
      requireInteraction: false
    };
    event.waitUntil(self.registration.showNotification(data.title || 'ClientFlow', options));
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // If a window is already open, focus it
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});

console.log('Service Worker loaded successfully');
