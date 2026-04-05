// =======================================
// O BOLSO DO FRED — Service Worker v2.4
// =======================================

const CACHE_VERSION = 'bolso-v2.4';
const CACHE_FILES = ['./', './index.html', './style.css', './app.js', './manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(CACHE_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;
    event.respondWith(
        fetch(event.request).then((response) => {
            if (response.ok) { const clone = response.clone(); caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone)); }
            return response;
        }).catch(() => caches.match(event.request))
    );
});

self.addEventListener('message', (event) => {
    if (event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = event.data.payload;
        self.registration.showNotification(title, { body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: tag || 'bolso-fred', vibrate: [100, 50, 100] });
    }
    if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) { clients[0].focus(); clients[0].postMessage({ type: 'CHECK_NOTIFICATIONS' }); }
        else self.clients.openWindow('./');
    }));
});
