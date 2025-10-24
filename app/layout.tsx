import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth-context";
import { ClientDarkLayout } from "../components/ClientDarkLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClubMaster - Sistema de Gestión Deportiva",
  description: "Sistema integral para la gestión de clubes deportivos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
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
