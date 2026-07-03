// Service Worker - DISABLED untuk debugging
// Jika masih error, hapus file ini dan hapus registrasi SW di browser

const CACHE_NAME = 'absensi-blkt-v9';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => caches.delete(key))
    ))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // JANGAN intercept request ke Google Apps Script
  if (event.request.url.includes('script.google.com') || 
      event.request.url.includes('googleusercontent.com')) {
    return;
  }
  
  // Cache only untuk static files
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
