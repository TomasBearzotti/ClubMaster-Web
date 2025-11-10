// Utilidades PWA para ClubMaster
// Funciones para Background Sync, Periodic Sync y Push Notifications

/**
 * Solicitar permiso para notificaciones push
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("Este navegador no soporta notificaciones");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Suscribirse a notificaciones push
 */
export async function subscribeToPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications no soportadas");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Solicitar permiso primero
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log("Permiso de notificaciones denegado");
      return null;
    }

    // Aquí deberías usar tu clave pública VAPID del servidor
    // Por ahora retornamos la subscription básica
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: null, // Reemplazar con tu VAPID public key
    });

    console.log("✅ Suscrito a push notifications");
    return subscription;
  } catch (error) {
    console.error("Error suscribiendo a push notifications:", error);
    return null;
  }
}

/**
 * Registrar Background Sync
 * Sincroniza datos cuando vuelve la conexión
 */
export async function registerBackgroundSync(tag: string = "sync-data") {
  if (!("serviceWorker" in navigator) || !("sync" in navigator.serviceWorker)) {
    console.warn("Background Sync no soportado");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
    console.log("✅ Background Sync registrado:", tag);
    return true;
  } catch (error) {
    console.error("Error registrando Background Sync:", error);
    return false;
  }
}

/**
 * Registrar Periodic Sync
 * Sincronización periódica en segundo plano
 */
export async function registerPeriodicSync(
  tag: string = "update-data",
  minInterval: number = 24 * 60 * 60 * 1000 // 24 horas por defecto
) {
  if (
    !("serviceWorker" in navigator) ||
    !("periodicSync" in navigator.serviceWorker)
  ) {
    console.warn("Periodic Sync no soportado");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // @ts-ignore - periodicSync puede no estar en tipos
    const status = await (navigator as any).permissions.query({
      name: "periodic-background-sync" as any,
    });

    if (status.state === "granted") {
      // @ts-ignore
      await registration.periodicSync.register(tag, {
        minInterval: minInterval,
      });
      console.log("✅ Periodic Sync registrado:", tag);
      return true;
    } else {
      console.log("Permiso de Periodic Sync no concedido");
      return false;
    }
  } catch (error) {
    console.error("Error registrando Periodic Sync:", error);
    return false;
  }
}

/**
 * Mostrar notificación local
 */
export async function showLocalNotification(
  title: string,
  options: NotificationOptions = {}
) {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    console.warn("Notificaciones no soportadas");
    return;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log("Permiso de notificaciones denegado");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      vibrate: [200, 100, 200],
      ...options,
    } as any);
  } catch (error) {
    console.error("Error mostrando notificación:", error);
  }
}

/**
 * Verificar si está instalado como PWA
 */
export function isInstalledPWA(): boolean {
  // @ts-ignore
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-ignore
    window.navigator.standalone === true
  );
}

/**
 * Verificar capacidades PWA del navegador
 */
export function checkPWACapabilities() {
  return {
    serviceWorker: "serviceWorker" in navigator,
    pushNotifications: "PushManager" in window,
    notifications: "Notification" in window,
    backgroundSync:
      "serviceWorker" in navigator &&
      "sync" in (navigator as any).serviceWorker,
    periodicSync:
      "serviceWorker" in navigator &&
      "periodicSync" in (navigator as any).serviceWorker,
    isInstalled: isInstalledPWA(),
  };
}
