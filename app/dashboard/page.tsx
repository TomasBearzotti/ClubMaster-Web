"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const dynamic = "force-dynamic";
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
  totalPartidos: number;
  partidosProgramados: number;
  totalArbitros: number;
}

interface SociosPorMes {
  mes: string;
  cantidad: number;
  nuevos: number;
  bajas: number;
  activos: number;
  inactivos: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [sociosPorMes, setSociosPorMes] = useState<SociosPorMes[]>([]);
  const [stats, setStats] = useState<EstadisticasDashboard>({
    totalSocios: 0,
    sociosActivos: 0,
    totalCuotas: 0,
    cuotasPagadas: 0,
    cuotasPendientes: 0,
    cuotasVencidas: 0,
    totalTorneos: 0,
    torneosActivos: 0,
    totalPartidos: 0,
    partidosProgramados: 0,
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
        await fetchSociosPorMes();
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
      const [sociosRes, cuotasRes, torneosRes, partidosRes, arbitrosRes] = await Promise.all(
        [
          fetch("/api/socios"),
          fetch("/api/cuotas"),
          fetch("/api/torneos"),
          fetch("/api/partidos"),
          fetch("/api/arbitros"),
        ]
      );

      const sociosData = sociosRes.ok ? await sociosRes.json() : [];
      const cuotasData = cuotasRes.ok ? await cuotasRes.json() : [];
      const torneosData = torneosRes.ok ? await torneosRes.json() : [];
      const partidosData = partidosRes.ok ? await partidosRes.json() : [];
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
      ).length;

      const totalPartidos = partidosData.length;
      const partidosProgramados = partidosData.filter(
        (p: any) => p.Estado === 0
      ).length;

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
        totalPartidos,
        partidosProgramados,
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

  const fetchSociosPorMes = async () => {
    try {
      const sociosRes = await fetch("/api/socios");
      if (!sociosRes.ok) return;
      
      const sociosData = await sociosRes.json();
      
      // Agrupar socios por mes de registro (últimos 6 meses)
      const hoy = new Date();
      const mesesAtras = 6;
      const datosPorMes: { [key: string]: { total: number; nuevos: number; activos: number; inactivos: number } } = {};
      
      // Inicializar últimos 6 meses
      for (let i = mesesAtras - 1; i >= 0; i--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const mesKey = fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
        datosPorMes[mesKey] = { total: 0, nuevos: 0, activos: 0, inactivos: 0 };
      }
      
      // Contar socios por mes de registro
      sociosData.forEach((socio: any) => {
        if (socio.FechaRegistro) {
          const fechaRegistro = new Date(socio.FechaRegistro);
          const mesKey = fechaRegistro.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
          
          if (datosPorMes[mesKey] !== undefined) {
            datosPorMes[mesKey].nuevos++;
          }
        }
      });
      
      // Calcular totales acumulados (activos e inactivos por mes)
      let acumuladoTotal = 0;
      let acumuladoActivos = 0;
      let acumuladoInactivos = 0;
      
      // Contar socios anteriores al periodo
      sociosData.forEach((s: any) => {
        if (!s.FechaRegistro) return;
        const fechaRegistro = new Date(s.FechaRegistro);
        const primeraFecha = new Date(hoy.getFullYear(), hoy.getMonth() - mesesAtras + 1, 1);
        if (fechaRegistro < primeraFecha) {
          acumuladoTotal++;
          if (s.Estado === 1) acumuladoActivos++;
          else acumuladoInactivos++;
        }
      });
      
      const resultado: SociosPorMes[] = [];
      Object.keys(datosPorMes).forEach((mes) => {
        // Contar nuevos activos e inactivos del mes
        const nuevosDelMes = sociosData.filter((s: any) => {
          if (!s.FechaRegistro) return false;
          const fechaRegistro = new Date(s.FechaRegistro);
          const mesKey = fechaRegistro.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
          return mesKey === mes;
        });
        
        const nuevosActivos = nuevosDelMes.filter((s: any) => s.Estado === 1).length;
        const nuevosInactivos = nuevosDelMes.filter((s: any) => s.Estado !== 1).length;
        
        acumuladoTotal += datosPorMes[mes].nuevos;
        acumuladoActivos += nuevosActivos;
        acumuladoInactivos += nuevosInactivos;
        
        resultado.push({
          mes,
          cantidad: acumuladoTotal,
          nuevos: datosPorMes[mes].nuevos,
          bajas: 0,
          activos: acumuladoActivos,
          inactivos: acumuladoInactivos,
        });
      });
      
      setSociosPorMes(resultado);
    } catch (error) {
      console.error("Error fetching socios por mes:", error);
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
              <ThemeToggle /> {/* 🔘 este es el switch */}
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

        {/* Sección de Gráficos Principales */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Gráfico de Evolución de Socios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Evolución de Socios
              </CardTitle>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.totalSocios}</p>
                  <p className="text-sm text-muted-foreground">Total de socios</p>
                </div>
                <div className="text-right">
                  {sociosPorMes.length > 0 && sociosPorMes[sociosPorMes.length - 1].nuevos > 0 && (
                    <p className="text-sm text-green-600 font-semibold">
                      +{sociosPorMes[sociosPorMes.length - 1].nuevos} este mes
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 font-semibold">{stats.sociosActivos} activos</span>
                    {" • "}
                    <span className="text-red-600 font-semibold">{stats.totalSocios - stats.sociosActivos} inactivos</span>
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sociosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                            <p className="font-semibold">{payload[0].payload.mes}</p>
                            <p className="text-sm">Total: {payload[0].payload.cantidad}</p>
                            <p className="text-sm text-green-600">
                              Activos: {payload[0].payload.activos}
                            </p>
                            <p className="text-sm text-red-600">
                              Inactivos: {payload[0].payload.inactivos}
                            </p>
                            <p className="text-sm text-blue-600">
                              Nuevos: +{payload[0].payload.nuevos}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="activos"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Socios Activos"
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="inactivos"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Socios Inactivos"
                    dot={{ fill: '#ef4444', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Cuotas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Estado de Cuotas
              </CardTitle>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.totalCuotas}</p>
                  <p className="text-sm text-muted-foreground">Total de cuotas</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-600 font-semibold">
                    {stats.cuotasPendientes + stats.cuotasVencidas} sin pagar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.cuotasPendientes} pendientes • {stats.cuotasVencidas} vencidas
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Pagadas', value: stats.cuotasPagadas, color: '#10b981' },
                      { name: 'Pendientes', value: stats.cuotasPendientes, color: '#f59e0b' },
                      { name: 'Vencidas', value: stats.cuotasVencidas, color: '#ef4444' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Pagadas', value: stats.cuotasPagadas, color: '#10b981' },
                      { name: 'Pendientes', value: stats.cuotasPendientes, color: '#f59e0b' },
                      { name: 'Vencidas', value: stats.cuotasVencidas, color: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* Sección de Estadísticas Restantes */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
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
                Partidos Programados
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.partidosProgramados}
              </div>
              <p className="text-xs text-muted-foreground">
                de {stats.totalPartidos} totales
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
                  Gestión de Seguridad y Backups
                </CardTitle>
                <Users className="h-6 w-6 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Administra las cuentas de acceso y roles de los usuarios del
                  sistema como tambien los Bakcups.
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
