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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  DollarSign,
  CreditCard,
  Loader2,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Cuota {
  IdCuota: number;
  NombreSocio: string;
  Periodo: string;
  Monto: number;
  FechaVencimiento: string;
  Estado: number;
}

interface CalculoRecargo {
  cuotaId: number;
  montoOriginal: number;
  mesesVencidos: number;
  porcentajeRecargo: number;
  montoRecargo: number;
  montoTotal: number;
  fechaVencimiento: string;
}

export default function RegistrarPagoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [cuotasPendientesSocio, setCuotasPendientesSocio] = useState<Cuota[]>(
    []
  );
  const [loadingCuotas, setLoadingCuotas] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCuota, setSelectedCuota] = useState<Cuota | null>(null);
  const [metodoPago, setMetodoPago] = useState("");
  const [calculoRecargo, setCalculoRecargo] = useState<CalculoRecargo | null>(
    null
  );
  const [processingPayment, setProcessingPayment] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>("todos");
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(20);

  // Cargar todas las cuotas pendientes y vencidas
  useEffect(() => {
    const fetchCuotas = async () => {
      setLoadingCuotas(true);
      try {
        const res = await fetch("/api/cuotas");
        if (res.ok) {
          const data = await res.json();
          // Filtrar solo pendientes y vencidas
          const cuotasNoPagadas = data.filter((c: Cuota) => c.Estado === 0);
          setCuotasPendientesSocio(cuotasNoPagadas);
        } else {
          setCuotasPendientesSocio([]);
          toast({
            title: "Error",
            description: "No se pudieron cargar las cuotas.",
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error(e);
        setCuotasPendientesSocio([]);
        toast({
          title: "Error",
          description: "Error de red al cargar cuotas.",
          variant: "destructive",
        });
      } finally {
        setLoadingCuotas(false);
      }
    };
    fetchCuotas();
  }, [toast]);

  // Calcular recargo cuando se abre el diálogo con una cuota
  const handlePagarCuota = async (cuota: Cuota) => {
    setSelectedCuota(cuota);
    setMetodoPago("");
    setCalculoRecargo(null);
    setShowPaymentDialog(true);
    try {
      const res = await fetch("/api/cuotas/calcular-recargo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuotaId: cuota.IdCuota }),
      });
      if (res.ok) {
        const calculo = await res.json();
        // Compatibilidad: si tu API devuelve {recargo, total}, mapear a la interfaz
        const mapped: CalculoRecargo = {
          cuotaId: cuota.IdCuota,
          montoOriginal: calculo.montoOriginal ?? cuota.Monto,
          mesesVencidos: calculo.mesesVencidos ?? 0,
          porcentajeRecargo: calculo.porcentajeRecargo ?? 0,
          montoRecargo: calculo.montoRecargo ?? calculo.recargo ?? 0,
          montoTotal: calculo.montoTotal ?? calculo.total ?? cuota.Monto,
          fechaVencimiento: calculo.fechaVencimiento ?? cuota.FechaVencimiento,
        };
        setCalculoRecargo(mapped);
      }
    } catch (e) {
      console.error("Error calculando recargo:", e);
    }
  };

  // Confirmar pago:
  const handleConfirmarPago = async () => {
    if (!selectedCuota || !metodoPago) {
      toast({
        title: "Error",
        description: "Selecciona un método de pago.",
        variant: "destructive",
      });
      return;
    }
    setProcessingPayment(true);
    try {
      if (metodoPago === "efectivo") {
        const res = await fetch("/api/cuotas/registrar-pago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cuotaId: selectedCuota.IdCuota,
            metodoPago,
            fechaPago: new Date().toISOString(),
            recargo: 0, // Admin en efectivo no aplica recargo
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(
            err?.error || "No se pudo registrar el pago en efectivo."
          );
        }
        toast({
          title: "Pago registrado",
          description: "Pago en efectivo cargado correctamente.",
        });
      } else {
        const res = await fetch("/api/cuotas/pago-online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cuotaId: selectedCuota.IdCuota,
            metodoPago, // "tarjeta_credito", "tarjeta_debito", "transferencia" (ajusta si tu API espera otros valores)
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "No se pudo procesar el pago online.");
        }
        const ok = await res.json();
        toast({
          title: "¡Pago online exitoso!",
          description: `Número de transacción: ${ok.numeroTransaccion ?? "—"}`,
        });
      }

      // refrescar cuotas pendientes
      const upd = await fetch("/api/cuotas");
      if (upd.ok) {
        const data = await upd.json();
        const cuotasNoPagadas = data.filter((c: Cuota) => c.Estado === 0);
        setCuotasPendientesSocio(cuotasNoPagadas);
      }

      // cerrar diálogo
      setShowPaymentDialog(false);
      setSelectedCuota(null);
      setMetodoPago("");
      setCalculoRecargo(null);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "Ocurrió un problema al registrar el pago.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);

  const getEstadoBadge = (estado: number, fechaVencimiento: string) => {
    const fechaVenc = new Date(fechaVencimiento);
    const hoy = new Date();
    if (estado === 1)
      return <Badge className="bg-green-100 text-green-800">Pagada</Badge>;
    if (fechaVenc < hoy)
      return <Badge className="bg-red-100 text-red-800">Vencida</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
  };

  const handleVolver = () => router.push("/cuotas");

  // Filtrado y paginación
  const mesesDisponibles = Array.from(
    new Set(cuotasPendientesSocio.map((c) => c.Periodo))
  ).sort((a, b) => {
    const [mesA, anioA] = a.split("/");
    const [mesB, anioB] = b.split("/");
    if (anioA !== anioB) return Number(anioB) - Number(anioA);
    return Number(mesB) - Number(mesA);
  });

  const cuotasFiltradas = cuotasPendientesSocio.filter((cuota) => {
    // Filtro de búsqueda (solo si hay texto)
    const cumpleBusqueda = !searchTerm ||
      cuota.NombreSocio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cuota.Periodo.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de mes (solo si no es "todos")
    const cumpleMes =
      mesSeleccionado === "todos" || cuota.Periodo === mesSeleccionado;
    
    return cumpleBusqueda && cumpleMes;
  });

  // Paginación
  const totalPaginas = Math.ceil(cuotasFiltradas.length / itemsPorPagina);
  const indexInicio = (paginaActual - 1) * itemsPorPagina;
  const indexFin = indexInicio + itemsPorPagina;
  const cuotasPaginadas = cuotasFiltradas.slice(indexInicio, indexFin);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, mesSeleccionado, itemsPorPagina]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
            <Button
              variant="outline"
              onClick={handleVolver}
              className="flex items-center gap-2 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Cuotas
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Registrar Pago de Cuota
          </h2>
        </div>

        {/* Cuotas Pendientes y Vencidas */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Cuotas a Cobrar
                  </CardTitle>
                  <CardDescription>
                    {mesSeleccionado === "todos"
                      ? "Todas las cuotas pendientes y vencidas"
                      : `Cuotas del período ${mesSeleccionado}`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar socio..."
                    className="w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Filtros y controles */}
              <div className="flex items-center justify-between flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Período:</span>
                  <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleccionar período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los períodos</SelectItem>
                      {mesesDisponibles.map((mes) => (
                        <SelectItem key={mes} value={mes}>
                          {mes}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Mostrar:</span>
                  <Select
                    value={itemsPorPagina.toString()}
                    onValueChange={(value) => setItemsPorPagina(Number(value))}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">por página</span>
                </div>
              </div>

              {/* Contador */}
              <div className="text-sm text-muted-foreground">
                Mostrando {indexInicio + 1}-{Math.min(indexFin, cuotasFiltradas.length)} de{" "}
                {cuotasFiltradas.length} cuotas
                {cuotasFiltradas.length !== cuotasPendientesSocio.length && (
                  <span> (filtradas de {cuotasPendientesSocio.length} totales)</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCuotas ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : cuotasPendientesSocio.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay cuotas pendientes.
              </div>
            ) : cuotasPaginadas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron cuotas con los filtros aplicados.
                </div>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Socio</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotasPaginadas.map((cuota) => (
                      <TableRow key={cuota.IdCuota}>
                        <TableCell className="font-medium">
                          {cuota.NombreSocio}
                        </TableCell>
                        <TableCell>{cuota.Periodo}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cuota.Monto)}
                        </TableCell>
                        <TableCell>
                          {new Date(cuota.FechaVencimiento).toLocaleDateString(
                            "es-AR"
                          )}
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(cuota.Estado, cuota.FechaVencimiento)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePagarCuota(cuota)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Cobrar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual(1)}
                    disabled={paginaActual === 1}
                  >
                    Primera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual(paginaActual - 1)}
                    disabled={paginaActual === 1}
                  >
                    Anterior
                  </Button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter((num) => {
                        return (
                          num === 1 ||
                          num === totalPaginas ||
                          (num >= paginaActual - 2 && num <= paginaActual + 2)
                        );
                      })
                      .map((num, idx, arr) => {
                        const prevNum = arr[idx - 1];
                        const showEllipsis = prevNum && num - prevNum > 1;

                        return (
                          <div key={num} className="flex items-center gap-1">
                            {showEllipsis && <span className="px-2">...</span>}
                            <Button
                              variant={paginaActual === num ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPaginaActual(num)}
                              className="w-10"
                            >
                              {num}
                            </Button>
                          </div>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual(paginaActual + 1)}
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual(totalPaginas)}
                    disabled={paginaActual === totalPaginas}
                  >
                    Última
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

        {/* Dialog de Pago (igual al socio, con Efectivo extra) */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
              <DialogDescription>Completa los datos del pago</DialogDescription>
            </DialogHeader>

            {selectedCuota && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Detalle de la Cuota</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Período:</span>
                      <span>{selectedCuota.Periodo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monto original:</span>
                      <span>{formatCurrency(selectedCuota.Monto)}</span>
                    </div>
                    {calculoRecargo && calculoRecargo.mesesVencidos > 0 && (
                      <>
                        <div className="flex justify-between text-orange-600">
                          <span>
                            Recargo ({calculoRecargo.mesesVencidos} mes(es)
                            vencido(s)):
                          </span>
                          <span>
                            {formatCurrency(calculoRecargo.montoRecargo)}
                          </span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>Total a pagar:</span>
                          <span>
                            {formatCurrency(calculoRecargo.montoTotal)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Método de Pago</label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">
                        Transferencia
                      </SelectItem>
                      <SelectItem value="tarjeta_debito">
                        Tarjeta de Débito
                      </SelectItem>
                      <SelectItem value="tarjeta_credito">
                        Tarjeta de Crédito
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {metodoPago === "efectivo" && (
                    <p className="text-xs text-gray-500">
                      En efectivo no se aplica recargo.
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentDialog(false);
                  setSelectedCuota(null);
                  setCalculoRecargo(null);
                  setMetodoPago("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarPago}
                disabled={!metodoPago || processingPayment}
              >
                {processingPayment ? "Procesando..." : "Confirmar Pago"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
