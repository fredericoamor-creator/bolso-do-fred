// =======================================
// O BOLSO DO FRED — Service Worker v2.3
// =======================================

const CACHE_VERSION = 'bolso-v2.3';
const CACHE_FILES = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// Instala e faz cache dos arquivos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(CACHE_FILES);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_VERSION)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Estratégia: Network First
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// Recebe mensagens do app
self.addEventListener('message', (event) => {
    if (event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = event.data.payload;
        self.registration.showNotification(title, {
            body,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            tag: tag || 'bolso-fred',
            vibrate: [100, 50, 100]
        });
    }

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Clique na notificação abre o app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            if (clients.length > 0) {
                clients[0].focus();
                clients[0].postMessage({ type: 'CHECK_NOTIFICATIONS' });
            } else {
                self.clients.openWindow('./');
            }
        })
    );
});
