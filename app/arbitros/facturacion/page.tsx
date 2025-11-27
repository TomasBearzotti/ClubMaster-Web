"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, DollarSign, Search, CheckCircle, Clock, XCircle, Calendar, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Factura {
  IdFactura: number
  IdArbitro: number
  IdPartido: number
  Monto: number
  Estado: number // 0: Programada, 1: Pendiente, 2: Pagada, 3: Cancelada
  FechaCreacion: string
  FechaPago: string | null
  MetodoPago: string | null
  NombreArbitro: string
  FechaPartido: string
  HoraPartido: string
  NombreTorneo: string
  EquipoA?: string
  EquipoB?: string
}

export default function FacturacionArbitrosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos")
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false)
  const [metodoPago, setMetodoPago] = useState<string>("")
  const [processingPago, setProcessingPago] = useState(false)

  useEffect(() => {
    fetchFacturas()
  }, [])

  const fetchFacturas = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/arbitros/facturacion")
      if (!response.ok) {
        throw new Error(`Error al cargar facturas: ${response.status}`)
      }
      const data: Factura[] = await response.json()
      setFacturas(data)
    } catch (error: any) {
      console.error("Error fetching facturas:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="h-3 w-3 mr-1" />
            Programada
          </Badge>
        )
      case 1:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Calendar className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      case 2:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pagada
          </Badge>
        )
      case 3:
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        )
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  const handlePagar = (factura: Factura) => {
    setSelectedFactura(factura)
    setMetodoPago("")
    setIsPagoModalOpen(true)
  }

  const handleConfirmarPago = async () => {
    if (!selectedFactura || !metodoPago) return

    setProcessingPago(true)
    try {
      const response = await fetch(`/api/arbitros/facturacion/${selectedFactura.IdFactura}/pagar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metodoPago: metodoPago,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al registrar pago")
      }

      toast({
        title: "Pago registrado",
        description: `Pago de $${selectedFactura.Monto.toLocaleString()} registrado exitosamente`,
      })

      setIsPagoModalOpen(false)
      fetchFacturas()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setProcessingPago(false)
    }
  }

  const handleCancelar = async (factura: Factura) => {
    if (!confirm(`¿Estás seguro de cancelar la factura #${factura.IdFactura}?`)) return

    try {
      const response = await fetch(`/api/arbitros/facturacion/${factura.IdFactura}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cancelar factura")
      }

      toast({
        title: "Factura cancelada",
        description: "La factura ha sido cancelada correctamente",
      })

      fetchFacturas()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const facturasFiltradas = facturas.filter((factura) => {
    const cumpleBusqueda =
      !searchTerm ||
      factura.NombreArbitro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.NombreTorneo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.IdFactura.toString().includes(searchTerm)

    const cumpleEstado = estadoFiltro === "todos" || factura.Estado.toString() === estadoFiltro

    return cumpleBusqueda && cumpleEstado
  })

  // Estadísticas
  const totalFacturas = facturas.length
  const facturasProgramadas = facturas.filter((f) => f.Estado === 0).length
  const facturasPendientes = facturas.filter((f) => f.Estado === 1).length
  const facturasPagadas = facturas.filter((f) => f.Estado === 2).length
  const totalPorPagar = facturas
    .filter((f) => f.Estado === 1)
    .reduce((sum, f) => sum + f.Monto, 0)
  const totalPagado = facturas
    .filter((f) => f.Estado === 2)
    .reduce((sum, f) => sum + f.Monto, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
            </div>
            <Button variant="outline" onClick={() => router.push("/arbitros")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a Árbitros
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Facturación de Árbitros
          </h2>
          <p className="text-gray-600">Administra los pagos a árbitros por partidos arbitrados</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalFacturas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Programadas</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{facturasProgramadas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{facturasPendientes}</div>
              <p className="text-xs text-muted-foreground">${totalPorPagar.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{facturasPagadas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalPagado.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Árbitro, torneo o # factura..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                  <SelectTrigger>
                    <SelectValue />
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
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Facturas */}
        <Card>
          <CardHeader>
            <CardTitle>Facturas de Árbitros</CardTitle>
            <CardDescription>
              Mostrando {facturasFiltradas.length} de {totalFacturas} facturas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Cargando facturas...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : facturasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No se encontraron facturas.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead># Factura</TableHead>
                    <TableHead>Árbitro</TableHead>
                    <TableHead>Partido</TableHead>
                    <TableHead>Torneo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasFiltradas.map((factura) => (
                    <TableRow key={factura.IdFactura}>
                      <TableCell className="font-medium">#{factura.IdFactura}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {factura.NombreArbitro.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{factura.NombreArbitro}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(factura.FechaPartido), "dd/MM/yyyy", { locale: es })} -{" "}
                        {factura.HoraPartido}
                      </TableCell>
                      <TableCell className="text-sm">{factura.NombreTorneo}</TableCell>
                      <TableCell className="font-semibold text-green-700">${factura.Monto.toLocaleString()}</TableCell>
                      <TableCell>{getEstadoBadge(factura.Estado)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(factura.FechaCreacion), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {factura.Estado === 1 && (
                            <Button size="sm" onClick={() => handlePagar(factura)} className="bg-green-600 hover:bg-green-700">
                              Pagar
                            </Button>
                          )}
                          {(factura.Estado === 0 || factura.Estado === 1) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelar(factura)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancelar
                            </Button>
                          )}
                          {factura.Estado === 2 && (
                            <Badge variant="outline" className="text-green-600">
                              {factura.MetodoPago}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal de Pago */}
      <Dialog open={isPagoModalOpen} onOpenChange={setIsPagoModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Registrar Pago
            </DialogTitle>
            <DialogDescription>
              {selectedFactura && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md space-y-1">
                  <div className="font-medium">Factura #{selectedFactura.IdFactura}</div>
                  <div className="text-sm">Árbitro: {selectedFactura.NombreArbitro}</div>
                  <div className="text-sm">Torneo: {selectedFactura.NombreTorneo}</div>
                  <div className="text-lg font-bold text-green-700 mt-2">
                    Monto: ${selectedFactura.Monto.toLocaleString()}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metodoPago">Método de Pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger id="metodoPago">
                  <SelectValue placeholder="Seleccionar método de pago..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPagoModalOpen(false)} disabled={processingPago}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPago} disabled={!metodoPago || processingPago} className="bg-green-600 hover:bg-green-700">
              {processingPago ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
