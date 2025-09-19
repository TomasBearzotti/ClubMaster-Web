"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DenegadoPage() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      try {
        const res = await fetch("/api/seguridad/roles/logged", {
          cache: "no-store",
        });
        if (!res.ok) {
          router.push("/login");
          return;
        }

        const role = await res.json();
        const permisos = (role.permisos ?? []).map((p: any) =>
          p.nombre?.toUpperCase()
        );

        if (permisos.includes("DASHBOARD_ADMIN")) {
          setTimeout(() => router.push("/dashboard"), 5000);
        } else if (permisos.includes("DASHBOARD_SOCIO")) {
          setTimeout(() => router.push("/socio-dashboard"), 5000);
        } else if (permisos.includes("DASHBOARD_ARBITRO")) {
          setTimeout(() => router.push("/arbitro-dashboard"), 5000);
        } else {
          setTimeout(() => router.push("/login"), 5000);
        }
      } catch {
        setTimeout(() => router.push("/login"), 5000);
      }
    };

    redirect();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white shadow-lg rounded-lg p-8 text-center max-w-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          🚫 Acceso Denegado
        </h1>
        <p className="text-gray-700 mb-4">
          No tenés permisos para acceder a esta sección.
        </p>
        <p className="text-sm text-gray-500">
          Vas a ser redirigido automáticamente a tu dashboard en unos segundos.
        </p>
      </div>
    </div>
  );
}
