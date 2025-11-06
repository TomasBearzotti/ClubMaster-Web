// ClubMaster Service Worker - SIN CACHE de contenido dinámico
// Estrategia: SIEMPRE red para páginas y APIs - Solo assets estáticos en cache

const VERSION = "clubmaster-v4.0";
const STATIC_CACHE = `${VERSION}-static`;

// Solo assets estáticos (íconos, manifest)
const STATIC_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
];

// ===== INSTALL =====
self.addEventListener("install", (event) => {
  console.log(`✅ SW ${VERSION} instalando...`);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => {
        console.log('✅ Assets estáticos cacheados');
        return self.skipWaiting();
      })
  );
});

// ===== ACTIVATE =====
self.addEventListener("activate", (event) => {
  console.log(`✅ SW ${VERSION} activando...`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('clubmaster-') && cacheName !== STATIC_CACHE)
          .map((cacheName) => {
            console.log(`🗑️ Eliminando cache antigua: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('✅ Caches antiguas eliminadas');
      return self.clients.claim();
    })
  );
});

// ===== FETCH - ESTRATEGIA NETWORK FIRST =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // IGNORAR requests de hot-reload, websockets, y chrome extensions
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/_next/static/webpack') ||
    url.protocol === 'chrome-extension:' ||
    request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);

  // 1. TODAS LAS PÁGINAS Y APIS - SIEMPRE RED, NUNCA CACHE
  if (
    request.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.json')
  ) {
    try {
      // Siempre red, sin cachear
      return await fetch(request);
    } catch (error) {
      console.log('❌ Sin conexión para:', url.pathname);
      
      // Si es navegación, mostrar mensaje offline
      if (request.mode === 'navigate') {
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>ClubMaster - Offline</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  background: #000;
                  color: #fff;
                }
                .container { text-align: center; padding: 2rem; }
                h1 { margin: 0 0 1rem; }
                p { margin: 0.5rem 0; color: #999; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🔌 Sin conexión</h1>
                <p>No se puede cargar ClubMaster sin internet</p>
                <p>Verifica tu conexión e intenta nuevamente</p>
              </div>
            </body>
          </html>`,
          {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          }
        );
      }
      
      // Para APIs, retornar error JSON
      return new Response(
        JSON.stringify({ error: 'Sin conexión', offline: true }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 2. ASSETS ESTÁTICOS - Cache primero (solo iconos y manifest)
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    try {
      const networkResponse = await fetch(request);
      if (networkResponse?.status === 200) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      console.log('❌ Error cargando asset:', url.pathname);
    }
  }

  // 3. TODO LO DEMÁS - SIEMPRE RED, SIN CACHE
  return await fetch(request);
}

// ===== MENSAJES =====
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log('⚡ Actualizando Service Worker...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === "CLEAR_CACHE") {
    console.log('🗑️ Limpiando todas las caches...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// ===== PUSH NOTIFICATIONS (opcional) =====
self.addEventListener('push', (event) => {
  console.log('📬 Push notification recibida');
  
  let notificationData = {
    title: 'ClubMaster',
    body: 'Nueva notificación',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: [200, 100, 200],
      data: notificationData.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

console.log(`🚀 ClubMaster SW ${VERSION} - Network First (Sin cache agresivo)`);