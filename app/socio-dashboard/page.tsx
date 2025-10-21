"use client";

import { CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  User,
  CreditCard,
  Trophy,
  DollarSign,
  Calendar,
  AlertCircle,
  Loader2,
  LogOut,
  Settings,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SocioData {
  IdSocio: number;
  Nombre: string;
  Dni: string;
  Email: string;
  Telefono: string;
  Estado: number;
  TipoMembresia: string;
  MontoMensual: number;
}

interface Cuota {
  IdCuota: number;
  Mes: number;
  Anio: number;
  Monto: number;
  Estado: number; // 0: Pendiente, 1: Pagada
  FechaVencimiento: string;
  FechaPago?: string;
  Periodo: string;
}

interface EstadoCuenta {
  socioId: number;
  cuotasVencidas: number;
  deudaTotal: number;
  estadoRiesgo: string;
  mensajeAlerta: string;
  cuotasRestantes: number;
}

export default function SocioDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [socio, setSocio] = useState<SocioData | null>(null);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // 1) Usuario logueado (desde cookie)
        const meRes = await fetch("/api/seguridad/roles/logged", {
          cache: "no-store",
          credentials: "include",
        });
        if (!meRes.ok) throw new Error("No se pudo obtener usuario actual");
        const me = await meRes.json();

        // 2) Resolver idPersona desde usuarios
        const usersRes = await fetch("/api/seguridad/usuarios", {
          cache: "no-store",
        });
        const users = await usersRes.json();
        const yo = users.find((u: any) => u.id === me.idUsuario);
        if (!yo?.idPersona) throw new Error("Usuario sin persona asignada");

        // 3) Resolver socio desde listado de socios
        const sociosRes = await fetch("/api/socios", { cache: "no-store" });
        const socios = await sociosRes.json();
        const socio = socios.find((s: any) => s.IdPersona === yo.idPersona);
        if (!socio) throw new Error("No se encontró socio");

        // 4) Cargar datos usando IdSocio
        await fetchSocioData(socio.IdSocio);
        await fetchCuotas(socio.IdSocio);
        await fetchEstadoCuenta(socio.IdSocio);

        setLoading(false);
      } catch (err) {
        console.error("Error inicializando dashboard socio:", err);
        toast({
          title: "Error",
          description: "No se pudieron cargar tus datos de socio.",
          variant: "destructive",
        });
        router.push("/");
      }
    };

    init();
  }, [router, toast]);

  const fetchSocioData = async (socioId: number) => {
    try {
      const response = await fetch(`/api/socios/${socioId}`);
      if (response.ok) {
        const data = await response.json();
        setSocio(data);
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar la información del socio.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching socio data:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los datos del socio.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCuotas = async (socioId: number) => {
    try {
      const response = await fetch(`/api/cuotas?socioId=${socioId}`);
      if (response.ok) {
        const data = await response.json();
        setCuotas(data);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las cuotas del socio.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching cuotas:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar las cuotas.",
        variant: "destructive",
      });
    }
  };

  const fetchEstadoCuenta = async (socioId: number) => {
    try {
      const response = await fetch(
        `/api/socios/estado-cuenta?socioId=${socioId}`
      );
      if (response.ok) {
        const data = await response.json();
        setEstadoCuenta(data);
      }
    } catch (error) {
      console.error("Error fetching estado cuenta:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const getEstadoBadge = (estado: number, fechaVencimiento: string) => {
    const fechaVenc = new Date(fechaVencimiento);
    const hoy = new Date();

    switch (estado) {
      case 1:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Pagada
          </Badge>
        );
      case 0:
        if (fechaVenc < hoy) {
          return (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              Vencida
            </Badge>
          );
        }
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const getAlertVariant = (estadoRiesgo: string) => {
    switch (estadoRiesgo) {
      case "suspendido":
        return "destructive";
      case "critico":
        return "destructive";
      case "advertencia":
        return "default";
      default:
        return "default";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!socio) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Error: No se pudo cargar la información del socio.
      </div>
    );
  }

  const cuotasPendientes = cuotas.filter((c) => c.Estado === 0);
  const cuotasVencidas = cuotas.filter((c) => {
    const fechaVenc = new Date(c.FechaVencimiento);
    const hoy = new Date();
    return c.Estado === 0 && fechaVenc < hoy;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header (mismo tamaño y clases originales) */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-700">
                ClubMaster Socio
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
              {/* Switch a la derecha */}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido/a, {socio.Nombre}
          </h2>
          <p className="text-gray-600">
            Tu panel de control personal en ClubMaster.
          </p>
        </div>

        {/* Alerta de Estado de Cuenta */}
        {estadoCuenta && estadoCuenta.estadoRiesgo !== "normal" && (
          <Alert
            variant={getAlertVariant(estadoCuenta.estadoRiesgo)}
            className="mb-6"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{estadoCuenta.mensajeAlerta}</AlertDescription>
          </Alert>
        )}

        {/* Información del Socio */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Mi Perfil</CardTitle>
              <User className="h-6 w-6 text-blue-600" />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">DNI:</span> {socio.Dni}
              </p>
              <p className="text-sm">
                <span className="font-medium">Email:</span> {socio.Email}
              </p>
              <p className="text-sm">
                <span className="font-medium">Teléfono:</span>{" "}
                {socio.Telefono || "N/A"}
              </p>
              <p className="text-sm">
                <span className="font-medium">Membresía:</span>{" "}
                {socio.TipoMembresia} ({formatCurrency(socio.MontoMensual)}/mes)
              </p>
              <p className="text-sm">
                <span className="font-medium">Estado:</span>{" "}
                <Badge
                  className={
                    socio.Estado === 1
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {socio.Estado === 1 ? "Activo" : "Inactivo"}
                </Badge>
              </p>
            </CardContent>
          </Card>

          {/* Resumen de Cuotas */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Resumen de Cuotas
              </CardTitle>
              <CreditCard className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{cuotas.length}</div>
                  <div className="text-sm text-gray-600">
                    Cuotas Registradas
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {cuotasPendientes.length}
                  </div>
                  <div className="text-sm text-gray-600">Cuotas Pendientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {cuotasVencidas.length}
                  </div>
                  <div className="text-sm text-gray-600">Cuotas Vencidas</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Acciones Rápidas */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/socio/cuotas")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Mis Cuotas
              </CardTitle>
              <DollarSign className="h-6 w-6 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Consulta el historial y estado de tus pagos.
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/socio/torneos")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Mis Torneos
              </CardTitle>
              <Trophy className="h-6 w-6 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Revisa tus inscripciones y resultados de torneos.
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/socio/equipos")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Mis Equipos
              </CardTitle>
              <Users className="h-6 w-6 text-purple-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gestiona tus equipos y sus integrantes.
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/socio/posiciones")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Tabla de Posiciones
              </CardTitle>
              <Calendar className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Consulta las clasificaciones de los torneos.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Últimas Cuotas Pendientes/Vencidas */}
        {cuotasPendientes.length > 0 && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Cuotas Pendientes/Vencidas
                </CardTitle>
                <CardDescription>
                  Revisa tus cuotas que requieren atención.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vencimiento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cuotasPendientes.map((cuota) => (
                        <tr key={cuota.IdCuota}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {cuota.Periodo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                            {formatCurrency(
                              Number.parseFloat(cuota.Monto.toString())
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(
                              cuota.FechaVencimiento
                            ).toLocaleDateString("es-AR")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getEstadoBadge(
                              cuota.Estado,
                              cuota.FechaVencimiento
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
