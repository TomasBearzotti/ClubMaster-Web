// ClubMaster Service Worker - Optimizado para desarrollo ágil
// Estrategia: Network First para TODO - Cache solo como último recurso offline

const VERSION = "clubmaster-v3.2";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_CACHE = `${VERSION}-offline`;

// Assets estáticos que NO cambian
const STATIC_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
];

// Página principal para acceso offline (login)
const OFFLINE_PAGE = '/';

// ===== INSTALL =====
self.addEventListener("install", (event) => {
  console.log(`✅ SW ${VERSION} instalando...`);
  
  event.waitUntil(
    Promise.all([
      // Cache de assets estáticos
      caches.open(STATIC_CACHE)
        .then((cache) => cache.addAll(STATIC_ASSETS)),
      
      // Cache de página principal (login) para offline
      caches.open(OFFLINE_CACHE)
        .then((cache) => {
          return fetch(OFFLINE_PAGE)
            .then((response) => {
              if (response.ok) {
                return cache.put(OFFLINE_PAGE, response);
              }
            })
            .catch(() => {
              console.log('⚠️ No se pudo cachear página principal (normal en primera instalación)');
            });
        })
    ])
    .then(() => {
      console.log('✅ Caches inicializadas');
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
            return cacheName.startsWith('clubmaster-') && 
                   cacheName !== STATIC_CACHE && 
                   cacheName !== RUNTIME_CACHE &&
                   cacheName !== OFFLINE_CACHE;
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

  // 1. HEALTH API - SIEMPRE INTENTA RED, NO CACHE (para verificar conexión BD)
  if (url.pathname === '/api/health') {
    try {
      const networkResponse = await fetch(request);
      return networkResponse;
    } catch (error) {
      console.log('❌ Health check falló (sin conexión)');
      return new Response(
        JSON.stringify({ 
          error: 'Sin conexión a internet',
          offline: true,
          status: 'offline'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // 2. PÁGINA PRINCIPAL (/) - DISPONIBLE OFFLINE desde cache
  if (request.mode === 'navigate' && url.pathname === '/') {
    try {
      // Intentar red primero
      const networkResponse = await fetch(request);
      
      if (networkResponse && networkResponse.status === 200) {
        // Actualizar cache con versión fresca
        const cache = await caches.open(OFFLINE_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      // Si falla red, usar cache
      console.log('📱 Sirviendo página principal desde cache (offline)');
      const cachedResponse = await caches.match(OFFLINE_PAGE);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
  }

  // 3. OTRAS PÁGINAS Y APIS - SIEMPRE RED PRIMERO, NO CACHE
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

  // 4. ASSETS ESTÁTICOS (_next/static, imágenes, etc) - Cache primero
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

  // 5. TODO LO DEMÁS - Red directa sin cache
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