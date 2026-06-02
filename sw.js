const CACHE_NAME = 'absensi-blkt-v3';
const urlsToCache = [
  '/absensi-Balaikota/',
  '/absensi-Balaikota/index.html',
  '/absensi-Balaikota/app.js',
  '/absensi-Balaikota/icon-192.png',
  '/absensi-Balaikota/icon-512.png',
  '/absensi-Balaikota/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
