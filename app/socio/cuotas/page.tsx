"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, CreditCard, FileText, Download, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Cuota {
  IdCuota: number
  Mes: number
  Anio: number
  Monto: number
  Estado: number
  FechaVencimiento: string
  FechaPago?: string
  Periodo: string
  Recargo?: number
}

interface CalculoRecargo {
  cuotaId: number
  montoOriginal: number
  mesesVencidos: number
  porcentajeRecargo: number
  montoRecargo: number
  montoTotal: number
  fechaVencimiento: string
}

export default function MisCuotasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [filtroAño, setFiltroAño] = useState("2025")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedCuota, setSelectedCuota] = useState<Cuota | null>(null)
  const [calculoRecargo, setCalculoRecargo] = useState<CalculoRecargo | null>(null)
  const [metodoPago, setMetodoPago] = useState("")
  const [processingPayment, setProcessingPayment] = useState(false)

  // Verificar autenticación
  useEffect(() => {
  const userData = localStorage.getItem("user")
  if (!userData) {
    router.push("/")
    return
  }

  const user = JSON.parse(userData)

  if (user.rol !== 2) {
    router.push("/dashboard")
    return
  }

  // 👇 Validar que realmente exista socioId antes de pedir cuotas
  if (!user.socioId) {
    console.error("El usuario no tiene socioId asignado")
    toast({
      title: "Error",
      description: "No se pudo cargar la información de socio.",
      variant: "destructive",
    })
    router.push("/socio-dashboard")
    return
  }

  fetchCuotas(user.socioId)
}, [router, toast])

  const fetchCuotas = async (socioId: number) => {
    try {
      const response = await fetch(`/api/cuotas?socioId=${socioId}`)
      if (response.ok) {
        const data = await response.json()
        setCuotas(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las cuotas.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching cuotas:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar las cuotas.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePagarCuota = async (cuota: Cuota) => {
    setSelectedCuota(cuota)

    // Calcular recargo si aplica
    try {
      const response = await fetch("/api/cuotas/calcular-recargo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cuotaId: cuota.IdCuota }),
      })

      if (response.ok) {
        const calculo = await response.json()
        setCalculoRecargo(calculo)
      }
    } catch (error) {
      console.error("Error calculando recargo:", error)
    }

    setShowPaymentDialog(true)
  }

  const handleConfirmarPago = async () => {
    if (!selectedCuota || !metodoPago) {
      toast({
        title: "Error",
        description: "Selecciona un método de pago.",
        variant: "destructive",
      })
      return
    }

    setProcessingPayment(true)

    try {
      const response = await fetch("/api/cuotas/pago-online", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cuotaId: selectedCuota.IdCuota,
          metodoPago,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "¡Pago exitoso!",
          description: `Pago procesado correctamente. Número de transacción: ${result.numeroTransaccion}`,
        })
        setShowPaymentDialog(false)
        setSelectedCuota(null)
        setCalculoRecargo(null)
        setMetodoPago("")

        // Recargar cuotas
        const userData = localStorage.getItem("user")
        if (userData) {
          const user = JSON.parse(userData)
          fetchCuotas(user.socioId)
        }
      } else {
        const error = await response.json()
        toast({
          title: "Error en el pago",
          description: error.error || "No se pudo procesar el pago.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar el pago.",
        variant: "destructive",
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  const cuotasFiltradas = cuotas.filter((cuota) => {
    const cumpleEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "pagada" && cuota.Estado === 1) ||
      (filtroEstado === "pendiente" && cuota.Estado === 0 && new Date(cuota.FechaVencimiento) >= new Date()) ||
      (filtroEstado === "vencida" && cuota.Estado === 0 && new Date(cuota.FechaVencimiento) < new Date())
    const cumpleAño = cuota.Anio.toString() === filtroAño
    return cumpleEstado && cumpleAño
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount)
  }

  const getEstadoBadge = (estado: number, fechaVencimiento: string) => {
    const fechaVenc = new Date(fechaVencimiento)
    const hoy = new Date()

    switch (estado) {
      case 1:
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pagada</Badge>
      case 0:
        if (fechaVenc < hoy) {
          return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Vencida</Badge>
        }
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  const calcularTotales = () => {
    const cuotasGeneradas = cuotasFiltradas.length
    const cuotasPagadas = cuotasFiltradas.filter((c) => c.Estado === 1).length
    const deudaTotal = cuotasFiltradas.filter((c) => c.Estado === 0).reduce((sum, c) => sum + c.Monto, 0)
    const totalPagado = cuotasFiltradas.filter((c) => c.Estado === 1).reduce((sum, c) => sum + c.Monto, 0)

    return { cuotasGeneradas, cuotasPagadas, deudaTotal, totalPagado }
  }

  const totales = calcularTotales()

  const handleVolver = () => {
    router.push("/socio-dashboard")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
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
            <Button variant="outline" onClick={handleVolver} className="flex items-center gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-green-600" />
            Mis Cuotas
          </h2>
          <p className="text-gray-600">Consulta tu historial de cuotas y realiza pagos online</p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtra tus cuotas por año y estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Año</label>
                <Select value={filtroAño} onValueChange={setFiltroAño}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="pagada">Pagadas</SelectItem>
                    <SelectItem value="pendiente">Pendientes</SelectItem>
                    <SelectItem value="vencida">Vencidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resumen del Período</CardTitle>
            <CardDescription>Estadísticas de tus cuotas para el año {filtroAño}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totales.cuotasGeneradas}</div>
                <div className="text-sm text-blue-800">Cuotas Generadas</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{totales.cuotasPagadas}</div>
                <div className="text-sm text-green-800">Cuotas Pagadas</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totales.totalPagado)}</div>
                <div className="text-sm text-green-800">Total Pagado</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totales.deudaTotal)}</div>
                <div className="text-sm text-red-800">Deuda Pendiente</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Cuotas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Cuotas
            </CardTitle>
            <CardDescription>
              Mostrando {cuotasFiltradas.length} cuotas para el año {filtroAño}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuotasFiltradas.map((cuota) => (
                  <TableRow key={cuota.IdCuota}>
                    <TableCell className="font-medium">{cuota.Periodo}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cuota.Monto)}</TableCell>
                    <TableCell>{getEstadoBadge(cuota.Estado, cuota.FechaVencimiento)}</TableCell>
                    <TableCell>{new Date(cuota.FechaVencimiento).toLocaleDateString("es-AR")}</TableCell>
                    <TableCell>
                      {cuota.FechaPago ? new Date(cuota.FechaPago).toLocaleDateString("es-AR") : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {cuota.Estado === 0 ? (
                        <Button variant="outline" size="sm" onClick={() => handlePagarCuota(cuota)}>
                          <DollarSign className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Comprobante
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog de Pago */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Pagar Cuota</DialogTitle>
              <DialogDescription>Completa el pago de tu cuota de forma segura</DialogDescription>
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
                          <span>Recargo ({calculoRecargo.mesesVencidos} mes(es) vencido(s)):</span>
                          <span>{formatCurrency(calculoRecargo.montoRecargo)}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>Total a pagar:</span>
                          <span>{formatCurrency(calculoRecargo.montoTotal)}</span>
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
                      <SelectItem value="tarjeta_credito">Tarjeta de Crédito</SelectItem>
                      <SelectItem value="tarjeta_debito">Tarjeta de Débito</SelectItem>
                      <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Los pagos en efectivo solo pueden realizarse en la administración del club
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentDialog(false)
                  setSelectedCuota(null)
                  setCalculoRecargo(null)
                  setMetodoPago("")
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmarPago} disabled={!metodoPago || processingPayment}>
                {processingPayment ? "Procesando..." : "Confirmar Pago"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
