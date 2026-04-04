// =======================================
// O BOLSO DO FRED — Service Worker v2.0
// =======================================

const CACHE_NAME = 'bolso-fred-v2';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Instalação — cacheia os assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Ativação — limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch — serve do cache, mas NÃO cacheia URLs com parâmetros (atalhos)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Se a URL tem parâmetros de query (veio do Atalho do iOS),
    // busca o index.html do cache mas deixa o JS processar os params
    if (url.searchParams.has('valor')) {
        event.respondWith(
            caches.match('./index.html')
                .then(response => response || fetch(event.request))
        );
        return;
    }

    // Para assets normais: cache first, fallback to network
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                return fetch(event.request)
                    .then(fetchRes => {
                        // Cacheia novos requests de navegação
                        if (fetchRes.ok && event.request.method === 'GET') {
                            const clone = fetchRes.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                        }
                        return fetchRes;
                    })
                    .catch(() => {
                        // Offline fallback
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});

// Recebe mensagens do app
self.addEventListener('message', (event) => {
    if (event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag, data } = event.data.payload;
        self.registration.showNotification(title, {
            body,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            tag: tag || 'default',
            data: data || {},
            vibrate: [100, 50, 100],
            requireInteraction: false
        });
    }

    if (event.data.type === 'SCHEDULE_CHECK') {
        // Preferências de notificação recebidas
    }
});

// Click em notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetScreen = event.notification.data?.screen || 'screen-dashboard';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clients => {
                // Se o app já está aberto, foca nele
                for (const client of clients) {
                    if (client.url.includes('bolso-do-fred') || client.url.includes('index.html')) {
                        client.postMessage({ type: 'NAVIGATE', screen: targetScreen });
                        return client.focus();
                    }
                }
                // Se não, abre o app
                return self.clients.openWindow('./');
            })
    );
});

// Periodic sync (se disponível)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-lembretes') {
        event.waitUntil(
            self.clients.matchAll({ type: 'window' })
                .then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'CHECK_NOTIFICATIONS' });
                    });
                })
        );
    }
});
