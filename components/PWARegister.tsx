"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const swPath = "/sw.js";

      // Desregistrar cualquier SW antiguo primero
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 1) {
          console.log("🗑️ Limpiando Service Workers antiguos...");
          registrations.forEach((registration, index) => {
            if (index > 0) {
              registration.unregister();
            }
          });
        }
      });

      navigator.serviceWorker
        .register(swPath, {
          scope: "/",
          updateViaCache: "none", // Forzar actualización sin cache
        })
        .then((registration) => {
          console.log("✅ Service Worker registrado:", registration.scope);

          // Actualizar cada 60 segundos para desarrollo
          setInterval(() => {
            registration.update();
          }, 60000);

          // Si hay uno esperando, activarlo inmediatamente
          if (registration.waiting) {
            console.log("⚡ Activando nuevo Service Worker...");
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }

          // Escuchar por actualizaciones
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("🔄 Nueva versión del Service Worker encontrada");

            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("⚡ Actualizando Service Worker...");
                  newWorker.postMessage({ type: "SKIP_WAITING" });

                  // Esperar un poco y recargar
                  setTimeout(() => {
                    console.log("🔄 Recargando página para aplicar cambios...");
                    window.location.reload();
                  }, 1000);
                }
              });
            }
          });

          // Detectar cuando el SW toma control
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            console.log("✅ Service Worker actualizado");
          });
        })
        .catch((error) => {
          console.error("❌ Error registrando Service Worker:", error);
        });

      // Limpiar caches al cargar la página (opcional, para desarrollo)
      if (process.env.NODE_ENV === "development") {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            if (
              cacheName.includes("clubmaster-v2") ||
              cacheName.includes("clubmaster-v3") ||
              cacheName.includes("offline") ||
              cacheName.includes("pages") ||
              cacheName.includes("runtime")
            ) {
              console.log("🗑️ Limpiando cache antigua:", cacheName);
              caches.delete(cacheName);
            }
          });
        });
      }
    }
  }, []);

  return null;
}
