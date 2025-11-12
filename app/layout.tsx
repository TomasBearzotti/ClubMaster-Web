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
  title: "ClubMaster - Gestión Deportiva",
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
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/ios/180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/ios/167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/ios/152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/ios/120.png" />
        
        {/* Favicon for browsers */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/ios/32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/ios/16.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/android/android-launchericon-192-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/android/android-launchericon-512-512.png" />
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
