// One Smart service worker
const CACHE = 'one-smart-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // network-first for API; cache-first for static
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return; // bypass cache for API
});

self.addEventListener('push', (event) => {
  let data = { title: 'One Smart', body: 'You have a reminder' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'One Smart', {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data || '/'));
});
