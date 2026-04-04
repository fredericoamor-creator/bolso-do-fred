// =======================================
// O BOLSO DO FRED — Service Worker v2.0
// =======================================

const CACHE_NAME = 'bolso-fred-v2.0';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};
    if (type === 'SHOW_NOTIFICATION') {
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            tag: payload.tag || 'bolso-fred',
            data: payload.data || {},
            vibrate: [100, 50, 100]
        });
    }
    if (type === 'SCHEDULE_CHECK') {
        self.notifConfig = payload;
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data || {};
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            for (const client of clients) {
                if (client.url.includes('index.html') || client.url.endsWith('/')) {
                    client.focus();
                    if (data.screen) client.postMessage({ type: 'NAVIGATE', screen: data.screen });
                    return;
                }
            }
            return self.clients.openWindow('./');
        })
    );
});

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-lembretes') {
        event.waitUntil(
            self.registration.showNotification('💰 O Bolso do Fred', {
                body: 'Confira suas contas e registre seus gastos!',
                icon: './icons/icon-192.png',
                tag: 'lembrete-periodico',
                data: { screen: 'screen-dashboard' }
            })
        );
    }
});
