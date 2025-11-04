// ClubMaster Service Worker - Enhanced with PWA features
// Includes: Offline Support, Background Sync, Periodic Sync, Push Notifications

const CACHE = "clubmaster-v2";
const OFFLINE_CACHE = "clubmaster-offline-v2";
const SYNC_QUEUE = "clubmaster-sync-queue";

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

// Offline fallback page
const offlineFallbackPage = "/";

// ===== INSTALL & ACTIVATION =====
self.addEventListener("install", async (event) => {
  console.log("✅ Service Worker instalando...");
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.add(offlineFallbackPage))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activado");
  event.waitUntil(self.clients.claim());
});

// ===== MENSAJES =====
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ===== WORKBOX CONFIGURATION =====
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Cache de navegación con estrategia StaleWhileRevalidate
workbox.routing.registerRoute(
  new RegExp('/*'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: CACHE
  })
);

// Cache de API con NetworkFirst (prioriza red, fallback a cache)
workbox.routing.registerRoute(
  /\/api\/.*/,
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutos
      }),
    ],
  })
);

// ===== FETCH CON OFFLINE SUPPORT =====
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          return preloadResp;
        }

        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        const cache = await caches.open(OFFLINE_CACHE);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp;
      }
    })());
  }
});

// ===== BACKGROUND SYNC =====
// Sincroniza datos cuando vuelve la conexión
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync disparado:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // Aquí puedes sincronizar datos pendientes
    console.log('✅ Sincronización completada');
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
  }
}

// ===== PERIODIC SYNC =====
// Sincronización periódica en segundo plano
self.addEventListener('periodicsync', (event) => {
  console.log('⏰ Periodic Sync disparado:', event.tag);
  
  if (event.tag === 'update-data') {
    event.waitUntil(updateDataPeriodically());
  }
});

async function updateDataPeriodically() {
  try {
    // Aquí puedes actualizar datos periódicamente
    console.log('✅ Actualización periódica completada');
  } catch (error) {
    console.error('❌ Error en actualización periódica:', error);
  }
}

// ===== PUSH NOTIFICATIONS =====
// Recibir notificaciones push
self.addEventListener('push', (event) => {
  console.log('📬 Push notification recibida');
  
  let notificationData = {
    title: 'ClubMaster',
    body: 'Tienes una nueva notificación',
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

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificación clickeada');
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

console.log('🚀 ClubMaster Service Worker cargado con todas las funcionalidades PWA');