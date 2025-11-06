// ClubMaster Service Worker - Optimizado para desarrollo ágil
// Estrategia: Network First para TODO - Cache solo como último recurso offline

const VERSION = "clubmaster-v3.1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// Solo cachear assets estáticos que NO cambian
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
        return self.skipWaiting(); // Activa inmediatamente
      })
  );
});

// ===== ACTIVATE =====
self.addEventListener("activate", (event) => {
  console.log(`✅ SW ${VERSION} activando...`);
  
  event.waitUntil(
    // Limpiar caches antiguos
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith('clubmaster-') && cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log(`🗑️ Eliminando cache antigua: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('✅ Caches antiguas eliminadas');
      return self.clients.claim(); // Toma control inmediato
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

  // 1. PÁGINAS HTML Y APIS - SIEMPRE RED PRIMERO, NO CACHE
  if (
    request.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.json')
  ) {
    try {
      // Siempre intentar red primero
      const networkResponse = await fetch(request);
      
      // No cachear respuestas de error
      if (!networkResponse || networkResponse.status !== 200) {
        return networkResponse;
      }

      return networkResponse;
    } catch (error) {
      // Solo si estamos offline, mostrar mensaje
      console.log('❌ Sin conexión para:', url.pathname);
      return new Response(
        JSON.stringify({ 
          error: 'Sin conexión a internet',
          offline: true 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // 2. ASSETS ESTÁTICOS (_next/static, imágenes, etc) - Cache primero
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.status === 200) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      console.log('❌ Error cargando asset:', url.pathname);
    }
  }

  // 3. TODO LO DEMÁS - Red directa sin cache
  try {
    return await fetch(request);
  } catch (error) {
    // Fallback solo para assets críticos
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
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