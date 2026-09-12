// SkinWatch Service Worker v50 - Instant Update & Network First
const CACHE_NAME = 'skinwatch-pwa-v50';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=8.0',
  './app.js?v=8.0',
  './manifest.json',
  './assets/logo.png',
  './assets/skinwatch-logo.png',
  './icon.svg',
  './skinwatch-icon-192.png',
  './skinwatch-icon-512.png',
  './skinwatch-icon-maskable-512.png',
  './skinwatch-favicon.ico',
  './skinwatch-favicon-32x32.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './favicon-32x32.png',
  './favicon-16x16.png'
];

// Install Event: Skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event: Wipe ALL old caches instantly & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('[SW] Purging stale cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for skip waiting messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event: Network-First to guarantee instant live updates
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
