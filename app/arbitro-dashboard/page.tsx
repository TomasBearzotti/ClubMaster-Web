"use client";

import { CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";
import {
  User,
  DollarSign,
  Calendar,
  Loader2,
  LogOut,
  Settings,
  Trophy,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ArbitroData {
  IdArbitro: number;
  Nombre: string;
  Email: string;
  Telefono: string;
  Estado: number;
  Tarifa: number | null;
  Deportes?: string;
  DeportesIds?: number[];
}

interface Partido {
  IdPartido: number;
  FechaPartido: string;
  HoraPartido: string;
  EquipoA: string;
  EquipoB: string;
  Lugar: string;
  EstadoPartido: string;
  TorneoNombre: string;
  Fase: string;
}

interface Factura {
  IdFactura: number;
  Monto: number;
  Estado: number;
  FechaCreacion: string;
  FechaPago?: string;
  MetodoPago?: string;
  PartidoInfo: string;
  TorneoNombre: string;
}

export default function ArbitroDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [arbitro, setArbitro] = useState<ArbitroData | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch("/api/seguridad/roles/logged", {
          cache: "no-store",
          credentials: "include",
        });
        if (!meRes.ok) throw new Error("No se pudo obtener usuario actual");
        const me = await meRes.json();

        const usersRes = await fetch("/api/seguridad/usuarios", { cache: "no-store" });
        const users = await usersRes.json();
        const yo = users.find((u: any) => u.id === me.idUsuario);
        if (!yo?.idPersona) throw new Error("Usuario sin persona asignada");

        const arbitrosRes = await fetch("/api/arbitros", { cache: "no-store" });
        const arbitros = await arbitrosRes.json();
        const arbitro = arbitros.find((a: any) => a.IdPersona === yo.idPersona);
        if (!arbitro) throw new Error("No se encontró árbitro");

        await fetchArbitroData(arbitro.IdArbitro);
        await fetchPartidos(arbitro.IdArbitro);
        await fetchFacturas(arbitro.IdArbitro);

        setLoading(false);
      } catch (err) {
        console.error("Error inicializando dashboard árbitro:", err);
        toast({
          title: "Error",
          description: "No se pudieron cargar tus datos de árbitro.",
          variant: "destructive",
        });
        router.push("/");
      }
    };

    init();
  }, [router, toast]);

  const fetchArbitroData = async (arbitroId: number) => {
    try {
      const response = await fetch(`/api/arbitros/${arbitroId}`);
      if (response.ok) {
        const data = await response.json();
        setArbitro(data);
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar la información del árbitro.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching arbitro data:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los datos del árbitro.",
        variant: "destructive",
      });
    }
  };

  const fetchPartidos = async (arbitroId: number) => {
    try {
      const response = await fetch("/api/partidos");
      if (response.ok) {
        const data = await response.json();
        const misPartidos = data.filter(
          (p: any) => p.ArbitroId === arbitroId && p.EstadoPartido !== "finalizado"
        );
        setPartidos(misPartidos);
      }
    } catch (error) {
      console.error("Error fetching partidos:", error);
    }
  };

  const fetchFacturas = async (arbitroId: number) => {
    try {
      const response = await fetch(`/api/arbitros/facturacion?arbitroId=${arbitroId}`);
      if (response.ok) {
        const data = await response.json();
        setFacturas(data);
      }
    } catch (error) {
      console.error("Error fetching facturas:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const getEstadoPartidoBadge = (estado: string) => {
    switch (estado) {
      case "programado":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Programado</Badge>;
      case "en_curso":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">En Curso</Badge>;
      case "finalizado":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Finalizado</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getEstadoFacturaBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Programada</Badge>;
      case 1:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>;
      case 2:
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pagada</Badge>;
      case 3:
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
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

  if (!arbitro) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Error: No se pudo cargar la información del árbitro.
      </div>
    );
  }

  const facturasProgramadas = facturas.filter((f) => f.Estado === 0);
  const facturasPendientes = facturas.filter((f) => f.Estado === 1);
  const facturasPagadas = facturas.filter((f) => f.Estado === 2);
  const totalPagado = facturasPagadas.reduce((sum, f) => sum + f.Monto, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-700">ClubMaster Árbitro</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/cuenta")}>
                <Settings className="h-5 w-5" />
                <span className="sr-only">Configuración de Cuenta</span>
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido/a, {arbitro.Nombre}
          </h2>
          <p className="text-gray-600">Tu panel de control personal en ClubMaster.</p>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Mi Perfil</CardTitle>
              <User className="h-6 w-6 text-blue-600" />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Email:</span> {arbitro.Email}
              </p>
              <p className="text-sm">
                <span className="font-medium">Teléfono:</span> {arbitro.Telefono || "N/A"}
              </p>
              <p className="text-sm">
                <span className="font-medium">Deportes:</span> {arbitro.Deportes || "Sin asignar"}
              </p>
              <p className="text-sm">
                <span className="font-medium">Tarifa:</span>{" "}
                {arbitro.Tarifa ? formatCurrency(arbitro.Tarifa) : "Sin configurar"}
              </p>
              <p className="text-sm">
                <span className="font-medium">Estado:</span>{" "}
                <Badge className={arbitro.Estado === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {arbitro.Estado === 1 ? "Activo" : "Inactivo"}
                </Badge>
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Resumen de Facturación</CardTitle>
              <DollarSign className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{facturas.length}</div>
                  <div className="text-sm text-gray-600">Total Facturas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{facturasProgramadas.length}</div>
                  <div className="text-sm text-gray-600">Programadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{facturasPendientes.length}</div>
                  <div className="text-sm text-gray-600">Pendientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPagado)}</div>
                  <div className="text-sm text-gray-600">Total Pagado</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/arbitro/configuracion")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Preferencias de Arbitraje</CardTitle>
              <Settings className="h-6 w-6 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gestiona tus deportes, horarios y tarifa.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/arbitro/finanzas")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Finanzas</CardTitle>
              <DollarSign className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gestiona tus pagos y facturas.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/partidos")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Partidos</CardTitle>
              <Trophy className="h-6 w-6 text-purple-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Ver y cargar resultados de partidos.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Mis Recibos
              </CardTitle>
              <CardDescription>Historial de pagos y facturas pendientes.</CardDescription>
            </CardHeader>
            <CardContent>
              {facturas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No tienes facturas registradas.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {facturas.map((factura) => (
                    <div key={factura.IdFactura} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-900">Factura #{factura.IdFactura}</p>
                          <p className="text-xs text-gray-600">{factura.TorneoNombre} - {factura.PartidoInfo}</p>
                        </div>
                        {getEstadoFacturaBadge(factura.Estado)}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-lg font-bold text-green-600">{formatCurrency(factura.Monto)}</span>
                        <span className="text-xs text-gray-500">{format(new Date(factura.FechaCreacion), "dd/MM/yyyy", { locale: es })}</span>
                      </div>
                      {factura.FechaPago && (
                        <div className="mt-2 text-xs text-gray-500">
                          Pagado: {format(new Date(factura.FechaPago), "dd/MM/yyyy", { locale: es })}
                          {factura.MetodoPago && ` - ${factura.MetodoPago}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-600" />
                Partidos Asignados
              </CardTitle>
              <CardDescription>Partidos que debes dirigir próximamente.</CardDescription>
            </CardHeader>
            <CardContent>
              {partidos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No tienes partidos asignados.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {partidos.map((partido) => (
                    <div key={partido.IdPartido} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-900">{partido.EquipoA} vs {partido.EquipoB}</p>
                          <p className="text-xs text-gray-600">{partido.TorneoNombre} - {partido.Fase}</p>
                        </div>
                        {getEstadoPartidoBadge(partido.EstadoPartido)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(partido.FechaPartido), "dd/MM/yyyy", { locale: es })} - {partido.HoraPartido}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">📍 {partido.Lugar}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
