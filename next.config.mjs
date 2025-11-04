// Deshabilitamos next-pwa y usamos el service worker de PWABuilder
// import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    "local-origin.dev",
    "*.local-origin.dev",
    "clubmaster.giize.com",
  ],
};

// Exportamos la config sin next-pwa, usamos pwabuilder-sw.js manual
export default nextConfig;
