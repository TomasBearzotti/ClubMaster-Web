"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Download,
  Eye,
  Loader2,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Factura {
  IdFactura: number;
  IdArbitro: number;
  IdPartido: number;
  Monto: number;
  Estado: number; // 0: Programada, 1: Pendiente, 2: Pagada, 3: Cancelada
  FechaCreacion: string;
  FechaPago: string | null;
  MetodoPago: string | null;
  NombreArbitro: string;
  FechaPartido: string;
  HoraPartido: string;
  NombreTorneo: string;
  EquipoA?: string;
  EquipoB?: string;
}

interface ComprobanteData {
  IdFactura: number;
  NumeroComprobante: string;
  FechaEmision: string;
  Arbitro: {
    Nombre: string;
    Dni: string;
  };
  Partido: {
    Torneo: string;
    Deporte: string;
    Fecha: string;
    Hora: string;
    Lugar: string;
    Equipos: string;
  };
  Monto: number;
  MetodoPago: string;
  Estado: string;
}

export default function FinanzasPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Estados para facturas
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [idArbitro, setIdArbitro] = useState<number | null>(null);

  // Estados para modal de detalle
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);

  // Estados para comprobante
  const [comprobante, setComprobante] = useState<ComprobanteData | null>(null);
  const [loadingComprobante, setLoadingComprobante] = useState(false);

  useEffect(() => {
    fetchArbitroData();
  }, []);

  useEffect(() => {
    if (idArbitro) {
      fetchFacturas();
    }
  }, [idArbitro]);

  const fetchArbitroData = async () => {
    try {
      // Obtener usuario logueado
      const meRes = await fetch("/api/seguridad/roles/logged", {
        cache: "no-store",
        credentials: "include",
      });
      if (!meRes.ok) {
        router.push("/");
        return;
      }
      const me = await meRes.json();

      // Obtener lista de usuarios para obtener idPersona
      const usersRes = await fetch("/api/seguridad/usuarios", { cache: "no-store" });
      if (!usersRes.ok) {
        router.push("/");
        return;
      }
      const users = await usersRes.json();
      const yo = users.find((u: any) => u.id === me.idUsuario);
      
      if (!yo?.idPersona) {
        toast({
          title: "Error",
          description: "Usuario sin persona asignada.",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      // Obtener lista de árbitros y buscar el del usuario actual
      const arbitrosResponse = await fetch("/api/arbitros", { cache: "no-store" });
      if (arbitrosResponse.ok) {
        const arbitros = await arbitrosResponse.json();
        const arbitro = arbitros.find(
          (a: any) => a.IdPersona === yo.idPersona
        );
        
        if (arbitro) {
          setIdArbitro(arbitro.IdArbitro);
        } else {
          toast({
            title: "Error",
            description: "No se encontró el perfil de árbitro.",
            variant: "destructive",
          });
          router.push("/arbitro-dashboard");
        }
      }
    } catch (error) {
      console.error("Error fetching arbitro data:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los datos.",
        variant: "destructive",
      });
      router.push("/");
    }
  };

  const fetchFacturas = async () => {
    if (!idArbitro) return;
    
    setLoadingFacturas(true);
    try {
      const response = await fetch(`/api/arbitros/facturacion?arbitroId=${idArbitro}`);
      if (response.ok) {
        const data: Factura[] = await response.json();
        setFacturas(data);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las facturas.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching facturas:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar las facturas.",
        variant: "destructive",
      });
    } finally {
      setLoadingFacturas(false);
    }
  };

  const handleDescargarComprobante = async (factura: Factura) => {
    if (factura.Estado !== 2) {
      toast({
        title: "Advertencia",
        description: "Solo se pueden descargar comprobantes de facturas pagadas.",
        variant: "destructive",
      });
      return;
    }

    setLoadingComprobante(true);
    try {
      const response = await fetch(
        `/api/arbitros/facturacion/${factura.IdFactura}/comprobante`
      );
      if (response.ok) {
        const data: ComprobanteData = await response.json();
        setComprobante(data);
        
        // Abrir ventana de impresión
        setTimeout(() => {
          window.print();
          setComprobante(null);
        }, 100);
      } else {
        toast({
          title: "Error",
          description: "No se pudo generar el comprobante.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error descargando comprobante:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al descargar el comprobante.",
        variant: "destructive",
      });
    } finally {
      setLoadingComprobante(false);
    }
  };

  const handleVerDetalle = (factura: Factura) => {
    setSelectedFactura(factura);
    setIsDetalleOpen(true);
  };

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="h-3 w-3 mr-1" />
            Programada
          </Badge>
        );
      case 1:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Calendar className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pagada
          </Badge>
        );
      case 3:
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        );
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const facturasFiltradas = facturas.filter((factura) => {
    const matchSearch = factura.NombreTorneo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchEstado =
      estadoFiltro === "todos" ||
      factura.Estado === Number.parseInt(estadoFiltro);

    return matchSearch && matchEstado;
  });

  const totalesFacturas = {
    total: facturas.length,
    programadas: facturas.filter((f) => f.Estado === 0).length,
    pendientes: facturas.filter((f) => f.Estado === 1).length,
    pagadas: facturas.filter((f) => f.Estado === 2).length,
    montoTotal: facturas.reduce((sum, f) => sum + f.Monto, 0),
    montoPagado: facturas
      .filter((f) => f.Estado === 2)
      .reduce((sum, f) => sum + f.Monto, 0),
    montoPendiente: facturas
      .filter((f) => f.Estado === 0 || f.Estado === 1)
      .reduce((sum, f) => sum + f.Monto, 0),
  };

  const handleVolver = () => {
    router.push("/arbitro-dashboard");
  };

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
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Mis Finanzas
          </h2>
          <p className="text-gray-600">
            Consulta tus facturas y honorarios como árbitro
          </p>
        </div>

        {/* Sección de Facturas */}
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-purple-600" />
            Mis Facturas
          </h3>

          {/* Cards de resumen de facturas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Facturas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">
                  {totalesFacturas.total}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Todas las facturas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Monto Pagado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${totalesFacturas.montoPagado.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {totalesFacturas.pagadas} facturas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Monto Pendiente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  ${totalesFacturas.montoPendiente.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {totalesFacturas.programadas + totalesFacturas.pendientes}{" "}
                  facturas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Monto Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${totalesFacturas.montoTotal.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Suma de todas las facturas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros de facturas */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtrar Facturas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por torneo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="0">Programadas</SelectItem>
                    <SelectItem value="1">Pendientes</SelectItem>
                    <SelectItem value="2">Pagadas</SelectItem>
                    <SelectItem value="3">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de facturas */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Facturas</CardTitle>
              <CardDescription>
                {facturasFiltradas.length} facturas encontradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFacturas ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : facturasFiltradas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No se encontraron facturas
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Torneo</TableHead>
                        <TableHead>Partido</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturasFiltradas.map((factura) => (
                        <TableRow key={factura.IdFactura}>
                          <TableCell className="font-medium">
                            #{factura.IdFactura}
                          </TableCell>
                          <TableCell>{factura.NombreTorneo}</TableCell>
                          <TableCell>
                            {factura.EquipoA || "TBD"} vs {factura.EquipoB || "TBD"}
                          </TableCell>
                          <TableCell>
                            {factura.FechaPartido
                              ? format(
                                  new Date(factura.FechaPartido),
                                  "dd/MM/yyyy",
                                  { locale: es }
                                )
                              : "Sin fecha"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${factura.Monto.toLocaleString()}
                          </TableCell>
                          <TableCell>{getEstadoBadge(factura.Estado)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerDetalle(factura)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {factura.Estado === 2 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDescargarComprobante(factura)
                                  }
                                  disabled={loadingComprobante}
                                >
                                  {loadingComprobante ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal de Detalle de Factura */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Factura #{selectedFactura?.IdFactura}</DialogTitle>
            <DialogDescription>
              Información completa de la factura
            </DialogDescription>
          </DialogHeader>
          {selectedFactura && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Árbitro</p>
                  <p className="font-semibold">{selectedFactura.NombreArbitro}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <div>{getEstadoBadge(selectedFactura.Estado)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Torneo</p>
                  <p className="font-semibold">{selectedFactura.NombreTorneo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monto</p>
                  <p className="font-semibold text-lg text-green-600">
                    ${selectedFactura.Monto.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha del Partido</p>
                  <p className="font-semibold">
                    {selectedFactura.FechaPartido
                      ? format(
                          new Date(selectedFactura.FechaPartido),
                          "dd/MM/yyyy",
                          { locale: es }
                        )
                      : "Sin fecha"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Hora del Partido</p>
                  <p className="font-semibold">
                    {selectedFactura.HoraPartido || "Sin hora"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Equipos</p>
                  <p className="font-semibold">
                    {selectedFactura.EquipoA || "TBD"} vs{" "}
                    {selectedFactura.EquipoB || "TBD"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de Creación</p>
                  <p className="font-semibold">
                    {format(
                      new Date(selectedFactura.FechaCreacion),
                      "dd/MM/yyyy HH:mm",
                      { locale: es }
                    )}
                  </p>
                </div>
                {selectedFactura.FechaPago && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Pago</p>
                      <p className="font-semibold">
                        {format(
                          new Date(selectedFactura.FechaPago),
                          "dd/MM/yyyy HH:mm",
                          { locale: es }
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Método de Pago</p>
                      <p className="font-semibold">
                        {selectedFactura.MetodoPago || "No especificado"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comprobante para impresión */}
      {comprobante && (
        <div className="hidden print:block">
          <div className="p-8 max-w-4xl mx-auto bg-white">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-blue-700 mb-2">
                ClubMaster
              </h1>
              <h2 className="text-xl font-semibold">
                Comprobante de Pago - Árbitro
              </h2>
              <p className="text-gray-600">
                {comprobante.NumeroComprobante}
              </p>
            </div>

            <div className="border-t border-b border-gray-300 py-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Fecha de Emisión:</p>
                  <p className="font-semibold">
                    {format(
                      new Date(comprobante.FechaEmision),
                      "dd/MM/yyyy HH:mm",
                      { locale: es }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado:</p>
                  <p className="font-semibold text-green-600">
                    {comprobante.Estado}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">Datos del Árbitro</h3>
              <p>
                <span className="font-semibold">Nombre:</span>{" "}
                {comprobante.Arbitro.Nombre}
              </p>
              <p>
                <span className="font-semibold">DNI:</span>{" "}
                {comprobante.Arbitro.Dni}
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">Detalles del Partido</h3>
              <p>
                <span className="font-semibold">Torneo:</span>{" "}
                {comprobante.Partido.Torneo}
              </p>
              <p>
                <span className="font-semibold">Deporte:</span>{" "}
                {comprobante.Partido.Deporte}
              </p>
              <p>
                <span className="font-semibold">Equipos:</span>{" "}
                {comprobante.Partido.Equipos}
              </p>
              <p>
                <span className="font-semibold">Fecha:</span>{" "}
                {format(new Date(comprobante.Partido.Fecha), "dd/MM/yyyy", {
                  locale: es,
                })}{" "}
                {comprobante.Partido.Hora}
              </p>
              <p>
                <span className="font-semibold">Lugar:</span>{" "}
                {comprobante.Partido.Lugar}
              </p>
            </div>

            <div className="border-t border-gray-300 pt-4">
              <div className="flex justify-between items-center text-xl">
                <span className="font-semibold">Monto Total:</span>
                <span className="font-bold text-green-600">
                  ${comprobante.Monto.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Método de pago: {comprobante.MetodoPago}
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
              <p>Este comprobante es válido como constancia de pago</p>
              <p>ClubMaster - Sistema de Gestión Deportiva</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
