// ClubMaster PWA Builder Service Worker - DEPRECADO
// Este archivo ya NO se usa - usar /sw.js v3.2

console.log('⚠️ pwabuilder-sw.js DEPRECADO - usar /sw.js v3.2');

self.addEventListener("install", (event) => {
  console.log("🔄 pwabuilder-sw instalando (deprecado)");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("✅ pwabuilder-sw activado (deprecado)");
  event.waitUntil(self.clients.claim());
});

// NO cachear nada, dejar que sw.js maneje todo
self.addEventListener('fetch', (event) => {
  // No interceptar - dejar pasar todas las requests
});
