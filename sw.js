// =======================================
// O BOLSO DO FRED — Service Worker v3.0
// =======================================

const CACHE_VERSION = 'bolso-v3.0';
const STATIC_CACHE = 'bolso-static-v3.0';
const DYNAMIC_CACHE = 'bolso-dynamic-v3.0';

const STATIC_FILES = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// Instala e faz cache dos arquivos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(STATIC_FILES);
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
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Estratégia: Cache First para assets estáticos, Network First para o resto
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    const url = new URL(event.request.url);
    const isStatic = STATIC_FILES.some(f => url.pathname.endsWith(f.replace('./', '')) || url.pathname === f);

    if (isStatic) {
        // Cache First para arquivos estáticos
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) {
                    // Atualiza em background
                    fetch(event.request).then((response) => {
                        if (response.ok) {
                            caches.open(STATIC_CACHE).then((cache) => {
                                cache.put(event.request, response);
                            });
                        }
                    }).catch(() => {});
                    return cached;
                }
                return fetch(event.request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
    } else {
        // Network First para o resto
        event.respondWith(
            fetch(event.request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                return caches.match(event.request);
            })
        );
    }
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
            vibrate: [100, 50, 100],
            actions: [
                { action: 'open', title: 'Abrir' },
                { action: 'dismiss', title: 'Dispensar' }
            ]
        });
    }

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Clique na notificação abre o app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'dismiss') return;
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
