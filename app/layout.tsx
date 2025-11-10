import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth-context";
import { PWARegister } from "@/components/PWARegister";
import { ClientDarkLayout } from "@/components/ClientDarkLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClubMaster - Sistema de Gestión Deportiva",
  description: "Sistema integral para la gestión de clubes deportivos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ClubMaster",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* 🔥 Bloque PWA: no modifica nada más */}
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="ClubMaster" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icons/icon-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/icons/icon-512x512.png"
        />
      </head>

      <body className={inter.className}>
        <PWARegister />
        <AuthProvider>
          <ClientDarkLayout>
            {children}
            <Toaster />
          </ClientDarkLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
