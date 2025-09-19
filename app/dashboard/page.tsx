"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  CreditCard,
  Trophy,
  ClipboardList,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Loader2,
  LogOut,
  Settings,
} from "lucide-react";
import { DatabaseStatus } from "@/components/database-status";
import { useToast } from "@/hooks/use-toast";

interface EstadisticasDashboard {
  totalSocios: number;
  sociosActivos: number;
  totalCuotas: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
  totalTorneos: number;
  torneosActivos: number;
  totalArbitros: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [stats, setStats] = useState<EstadisticasDashboard>({
    totalSocios: 0,
    sociosActivos: 0,
    totalCuotas: 0,
    cuotasPagadas: 0,
    cuotasPendientes: 0,
    cuotasVencidas: 0,
    totalTorneos: 0,
    torneosActivos: 0,
    totalArbitros: 0,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/seguridad/roles/logged", {
          cache: "no-store",
          credentials: "include",
        });
        if (res.ok) {
          const role = await res.json();
          const permisosArray = (role.permisos ?? []).map((p: any) =>
            p.nombre?.toUpperCase()
          );
          setPermisos(permisosArray);
        }

        // cargar estadísticas
        await fetchDashboardStats();
      } catch (err) {
        console.error("Error inicializando dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [sociosRes, cuotasRes, torneosRes, arbitrosRes] = await Promise.all(
        [
          fetch("/api/socios"),
          fetch("/api/cuotas"),
          fetch("/api/torneos"),
          fetch("/api/arbitros"),
        ]
      );

      const sociosData = sociosRes.ok ? await sociosRes.json() : [];
      const cuotasData = cuotasRes.ok ? await cuotasRes.json() : [];
      const torneosData = torneosRes.ok ? await torneosRes.json() : [];
      const arbitrosData = arbitrosRes.ok ? await arbitrosRes.json() : [];

      const totalSocios = sociosData.length;
      const sociosActivos = sociosData.filter(
        (s: any) => s.Estado === 1
      ).length;

      const totalCuotas = cuotasData.length;
      const cuotasPagadas = cuotasData.filter(
        (c: any) => c.Estado === 1
      ).length;
      const cuotasPendientes = cuotasData.filter(
        (c: any) => c.Estado === 0
      ).length;
      const vencidas = cuotasData.filter((c: any) => {
        const fechaVenc = new Date(c.FechaVencimiento);
        const hoy = new Date();
        return c.Estado === 0 && fechaVenc < hoy;
      }).length;

      const totalTorneos = torneosData.length;
      const torneosActivos = torneosData.filter(
        (t: any) => t.Estado === 0
      ).length; // Asumiendo 0 es activo/pendiente

      const totalArbitros = arbitrosData.length;

      setStats({
        totalSocios,
        sociosActivos,
        totalCuotas,
        cuotasPagadas,
        cuotasPendientes,
        cuotasVencidas: vencidas,
        totalTorneos,
        torneosActivos,
        totalArbitros,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas del dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/seguridad/logout", { method: "POST" });
      router.push("/");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-700">
                ClubMaster Admin
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/cuenta")}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Configuración de Cuenta</span>
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Administrativo
          </h2>
          <p className="text-gray-600">
            Resumen y acceso rápido a las funciones principales del club.
          </p>
        </div>

        {/* Database Status */}
        <div className="mb-8">
          <DatabaseStatus />
        </div>

        {/* Sección de Estadísticas */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Socios
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSocios}</div>
              <p className="text-xs text-muted-foreground">
                {stats.sociosActivos} activos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cuotas Pagadas
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.cuotasPagadas}
              </div>
              <p className="text-xs text-muted-foreground">
                de {stats.totalCuotas} totales
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cuotas Vencidas
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.cuotasVencidas}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.cuotasPendientes} pendientes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Torneos Activos
              </CardTitle>
              <Trophy className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.torneosActivos}
              </div>
              <p className="text-xs text-muted-foreground">
                de {stats.totalTorneos} totales
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Árbitros Registrados
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalArbitros}
              </div>
              <p className="text-xs text-muted-foreground">
                Disponibilidad gestionable
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Sección de Módulos */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {permisos.includes("GESTION_USUARIOS") && (
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push("/usuarios")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">
                  Gestión de Usuarios
                </CardTitle>
                <Users className="h-6 w-6 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Administra las cuentas de acceso y roles de los usuarios del
                  sistema.
                </p>
              </CardContent>
            </Card>
          )}
          {permisos.includes("GESTION_SOCIOS") && (
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push("/socios")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">
                  Gestión de Socios
                </CardTitle>
                <Users className="h-6 w-6 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Administra la información de los miembros del club.
                </p>
              </CardContent>
            </Card>
          )}
          {permisos.includes("GESTION_CUOTAS") && (
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push("/cuotas")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">
                  Gestión de Cuotas
                </CardTitle>
                <CreditCard className="h-6 w-6 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Controla pagos, genera cuotas y gestiona el estado financiero.
                </p>
              </CardContent>
            </Card>
          )}
          {permisos.includes("GESTION_TORNEOS") && (
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push("/torneos")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">
                  Gestión de Torneos
                </CardTitle>
                <Trophy className="h-6 w-6 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Organiza, inscribe participantes y gestiona resultados de
                  torneos.
                </p>
              </CardContent>
            </Card>
          )}
          {permisos.includes("GESTION_ARBITROS") && (
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push("/arbitros")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">
                  Gestión de Árbitros
                </CardTitle>
                <UserCheck className="h-6 w-6 text-purple-600" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Administra árbitros, su disponibilidad y asignaciones.
                </p>
              </CardContent>
            </Card>
          )}
          {permisos.includes("REPORTES") && (
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push("/reportes")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">
                  Reportes y Estadísticas
                </CardTitle>
                <ClipboardList className="h-6 w-6 text-red-600" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Accede a informes detallados sobre el club.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
