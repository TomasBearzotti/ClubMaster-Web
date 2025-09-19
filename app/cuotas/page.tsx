"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Search,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  User,
  Loader2,
} from "lucide-react";

interface Cuota {
  IdCuota: number;
  NombreSocio: string;
  Periodo: string;
  Monto: number;
  FechaVencimiento: string;
  Estado: number; // 0: Pendiente, 1: Pagada
  FechaPago?: string;
}

interface EstadisticasCuotas {
  totalCuotas: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
  montoTotal: number;
  montoPagado: number;
}

export default function GestionCuotasPage() {
  const router = useRouter();
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCuotas>({
    totalCuotas: 0,
    cuotasPagadas: 0,
    cuotasPendientes: 0,
    cuotasVencidas: 0,
    montoTotal: 0,
    montoPagado: 0,
  });

  useEffect(() => {
    loadCuotas();
  }, []);

  const loadCuotas = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cuotas");
      if (response.ok) {
        const cuotasData = await response.json();
        setCuotas(Array.isArray(cuotasData) ? cuotasData : []);

        // Calcular estadísticas
        const total = cuotasData.length;
        const pagadas = cuotasData.filter((c: any) => c.Estado === 1).length;
        const pendientes = cuotasData.filter((c: any) => c.Estado === 0).length;
        const vencidas = cuotasData.filter((c: any) => {
          const fechaVenc = new Date(c.FechaVencimiento);
          const hoy = new Date();
          // Una cuota está vencida si está pendiente (Estado 0) y su fecha de vencimiento ya pasó
          return c.Estado === 0 && fechaVenc < hoy;
        }).length;

        const montoTotal = cuotasData.reduce(
          (sum: number, c: any) =>
            sum +
            Number.parseFloat(c.Monto) +
            Number.parseFloat(c.Recargo || 0),
          0
        );

        const montoPagado = cuotasData
          .filter((c: any) => c.Estado === 1)
          .reduce(
            (sum: number, c: any) =>
              sum +
              Number.parseFloat(c.Monto) +
              Number.parseFloat(c.Recargo || 0),
            0
          );

        setEstadisticas({
          totalCuotas: total,
          cuotasPagadas: pagadas,
          cuotasPendientes: pendientes,
          cuotasVencidas: vencidas,
          montoTotal,
          montoPagado,
        });
      }
    } catch (error) {
      console.error("Error cargando cuotas:", error);
    } finally {
      setLoading(false);
    }
  };

  const cuotasFiltradas = cuotas.filter(
    (cuota) =>
      cuota.NombreSocio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cuota.Periodo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
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

  const handleVolver = () => {
    router.push("/dashboard");
  };

  const handleGenerarCuotas = () => {
    router.push("/cuotas/generar");
  };

  const handleResumenSocio = () => {
    router.push("/cuotas/socio");
  };

  const handleRegistrarPago = () => {
    router.push("/cuotas/registrar-pago");
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
              <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
            </div>
            <Button
              variant="outline"
              onClick={handleVolver}
              className="flex items-center gap-2 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Menú
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-blue-600" />
            Gestión de Cuotas
          </h2>
          <p className="text-gray-600">
            Administra las cuotas mensuales de los socios del club
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Cuotas
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticas.totalCuotas}
              </div>
              <p className="text-xs text-muted-foreground">Generadas</p>
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
                {estadisticas.cuotasPagadas}
              </div>
              <p className="text-xs text-muted-foreground">
                {estadisticas.totalCuotas > 0
                  ? Math.round(
                      (estadisticas.cuotasPagadas / estadisticas.totalCuotas) *
                        100
                    )
                  : 0}
                % del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cuotas Pendientes
              </CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {estadisticas.cuotasPendientes}
              </div>
              <p className="text-xs text-muted-foreground">Por vencer</p>
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
                {estadisticas.cuotasVencidas}
              </div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Button
            onClick={handleGenerarCuotas}
            className="bg-green-600 hover:bg-green-700 h-12 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Generar Cuotas Mensuales
          </Button>

          <Button
            onClick={handleResumenSocio}
            variant="outline"
            className="h-12 flex items-center gap-2 bg-transparent"
          >
            <User className="h-5 w-5" />
            Resumen por Socio
          </Button>

          <Button
            onClick={handleRegistrarPago}
            variant="outline"
            className="h-12 flex items-center gap-2 bg-transparent"
          >
            <DollarSign className="h-5 w-5" />
            Registrar Pago
          </Button>

          <Button
            variant="outline"
            className="h-12 flex items-center gap-2 bg-transparent"
          >
            <FileText className="h-5 w-5" />
            Reportes de Cuotas
          </Button>
        </div>

        {/* Resumen Financiero */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumen Financiero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(estadisticas.montoTotal)}
                </div>
                <div className="text-sm text-gray-600">
                  Monto Total Esperado
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(estadisticas.montoPagado)}
                </div>
                <div className="text-sm text-gray-600">Monto Recaudado</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(
                    estadisticas.montoTotal - estadisticas.montoPagado
                  )}
                </div>
                <div className="text-sm text-gray-600">Monto Pendiente</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Cuotas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Cuotas Registradas</CardTitle>
                <CardDescription>
                  Lista de todas las cuotas del sistema
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar socio o período..."
                  className="w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Socio</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuotasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      No se encontraron cuotas.
                    </TableCell>
                  </TableRow>
                ) : (
                  cuotasFiltradas.map((cuota) => (
                    <TableRow key={cuota.IdCuota}>
                      <TableCell className="font-medium">
                        {cuota.NombreSocio}
                      </TableCell>
                      <TableCell>{cuota.Periodo}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          Number.parseFloat(cuota.Monto.toString())
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(cuota.FechaVencimiento).toLocaleDateString(
                          "es-AR"
                        )}
                      </TableCell>
                      <TableCell>
                        {cuota.FechaPago
                          ? new Date(cuota.FechaPago).toLocaleDateString(
                              "es-AR"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {getEstadoBadge(cuota.Estado, cuota.FechaVencimiento)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
