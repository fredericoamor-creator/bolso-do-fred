// =============================================
// O BOLSO DO FRED — Service Worker v2.5
// =============================================

const CACHE_NAME = 'bolso-fred-v2.5';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
    // Ignora requisições não-GET e de extensões externas
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Retorna do cache e atualiza em background
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {});
                return cachedResponse;
            }

            // Se não está no cache, busca na rede
            return fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback para navegação offline
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('Offline', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
        })
    );
});

// ===== MENSAGENS DO APP =====
self.addEventListener('message', (event) => {
    if (!event.data) return;

    // Exibir notificação
    if (event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = event.data.payload;
        self.registration.showNotification(title, {
            body,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            tag: tag || 'bolso-fred',
            vibrate: [100, 50, 100],
            data: { tag },
            actions: [
                { action: 'open', title: 'Abrir App' },
                { action: 'dismiss', title: 'Dispensar' }
            ]
        });
    }

    // Forçar atualização do cache
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ===== CLIQUE NA NOTIFICAÇÃO =====
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Se já tem uma janela aberta, foca nela
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    // Navega para a tela relevante
                    const tag = event.notification.data?.tag;
                    if (tag === 'fixas') {
                        client.postMessage({ type: 'NAVIGATE', screen: 'screen-fixas' });
                    } else if (tag === 'orc-75' || tag === 'orc-100') {
                        client.postMessage({ type: 'NAVIGATE', screen: 'screen-metas' });
                    } else {
                        client.postMessage({ type: 'NAVIGATE', screen: 'screen-dashboard' });
                    }
                    return;
                }
            }
            // Se não tem janela aberta, abre uma nova
            return self.clients.openWindow('./');
        })
    );
});

// ===== PUSH (futuro) =====
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title || '💰 Bolso do Fred', {
                body: data.body || 'Você tem uma nova notificação',
                icon: './icons/icon-192.png',
                badge: './icons/icon-192.png',
                tag: data.tag || 'bolso-fred-push',
                vibrate: [100, 50, 100]
            })
        );
    } catch (e) {
        // Fallback para texto puro
        event.waitUntil(
            self.registration.showNotification('💰 Bolso do Fred', {
                body: event.data.text(),
                icon: './icons/icon-192.png'
            })
        );
    }
});

// ===== SYNC EM BACKGROUND (futuro) =====
self.addEventListener('sync', (event) => {
    if (event.tag === 'check-notifications') {
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'CHECK_NOTIFICATIONS' });
                });
            })
        );
    }
});
