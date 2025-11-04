"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Usar el service worker
      const swPath = "/sw.js";

      navigator.serviceWorker
        .register(swPath, { scope: "/" })
        .then((registration) => {
          console.log("✅ Service Worker registrado:", registration.scope);
          console.log("📦 Service Worker:", swPath);

          // Enviar mensaje para skip waiting
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("🔄 Nueva versión del Service Worker disponible");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("❌ Error registrando Service Worker:", error);
        });
    }
  }, []);

  return null;
}
