"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { ArrowLeft, Search, DollarSign, CreditCard, Loader2, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Socio {
  IdSocio: number
  Nombre: string
  Apellido: string
  DNI: string
  TipoMembresia: string
}

interface Cuota {
  IdCuota: number
  Periodo: string
  Monto: number
  FechaVencimiento: string
  Estado: number // 0: Pendiente, 1: Pagada
}

interface CalculoRecargo {
  cuotaId: number
  montoOriginal: number
  mesesVencidos: number
  porcentajeRecargo: number
  montoRecargo: number
  montoTotal: number
  fechaVencimiento: string
  // si tu endpoint devuelve otra forma, al menos debe incluir "montoRecargo" y "montoTotal"
}

export default function RegistrarPagoPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null)
  const [sociosFiltrados, setSociosFiltrados] = useState<Socio[]>([])
  const [loadingSocios, setLoadingSocios] = useState(false)

  const [cuotasPendientesSocio, setCuotasPendientesSocio] = useState<Cuota[]>([])
  const [loadingCuotas, setLoadingCuotas] = useState(false)

  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedCuota, setSelectedCuota] = useState<Cuota | null>(null)
  const [metodoPago, setMetodoPago] = useState("")
  const [calculoRecargo, setCalculoRecargo] = useState<CalculoRecargo | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  // Auth: admin (rol 1)
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    const user = JSON.parse(userData)
    if (user.rol !== 1) {
      router.push("/socio-dashboard")
      return
    }
  }, [router])

  // Búsqueda de socios (debounced)
  useEffect(() => {
    const fetchSocios = async () => {
      if (searchTerm.length < 3) {
        setSociosFiltrados([])
        return
      }
      setLoadingSocios(true)
      try {
        const res = await fetch(`/api/socios?search=${encodeURIComponent(searchTerm)}`)
        if (res.ok) {
          const data = await res.json()
          setSociosFiltrados(data)
        } else {
          setSociosFiltrados([])
          toast({ title: "Error", description: "No se pudieron cargar los socios.", variant: "destructive" })
        }
      } catch (e) {
        console.error(e)
        setSociosFiltrados([])
        toast({ title: "Error", description: "Error de red al buscar socios.", variant: "destructive" })
      } finally {
        setLoadingSocios(false)
      }
    }
    const t = setTimeout(fetchSocios, 500)
    return () => clearTimeout(t)
  }, [searchTerm, toast])

  // Cuotas pendientes del socio elegido
  useEffect(() => {
    const fetchCuotas = async () => {
      if (!selectedSocio) {
        setCuotasPendientesSocio([])
        return
      }
      setLoadingCuotas(true)
      try {
        const res = await fetch(`/api/cuotas?socioId=${selectedSocio.IdSocio}&estado=0`)
        if (res.ok) {
          const data = await res.json()
          setCuotasPendientesSocio(data)
        } else {
          setCuotasPendientesSocio([])
          toast({ title: "Error", description: "No se pudieron cargar las cuotas pendientes.", variant: "destructive" })
        }
      } catch (e) {
        console.error(e)
        setCuotasPendientesSocio([])
        toast({ title: "Error", description: "Error de red al cargar cuotas pendientes.", variant: "destructive" })
      } finally {
        setLoadingCuotas(false)
      }
    }
    fetchCuotas()
  }, [selectedSocio, toast])

  // Calcular recargo cuando se abre el diálogo con una cuota
  const handlePagarCuota = async (cuota: Cuota) => {
    setSelectedCuota(cuota)
    setMetodoPago("")
    setCalculoRecargo(null)
    setShowPaymentDialog(true)
    try {
      const res = await fetch("/api/cuotas/calcular-recargo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuotaId: cuota.IdCuota }),
      })
      if (res.ok) {
        const calculo = await res.json()
        // Compatibilidad: si tu API devuelve {recargo, total}, mapear a la interfaz
        const mapped: CalculoRecargo = {
          cuotaId: cuota.IdCuota,
          montoOriginal: calculo.montoOriginal ?? cuota.Monto,
          mesesVencidos: calculo.mesesVencidos ?? 0,
          porcentajeRecargo: calculo.porcentajeRecargo ?? 0,
          montoRecargo: calculo.montoRecargo ?? calculo.recargo ?? 0,
          montoTotal: calculo.montoTotal ?? calculo.total ?? cuota.Monto,
          fechaVencimiento: calculo.fechaVencimiento ?? cuota.FechaVencimiento,
        }
        setCalculoRecargo(mapped)
      }
    } catch (e) {
      console.error("Error calculando recargo:", e)
    }
  }

  // Confirmar pago:
  // - efectivo => /api/cuotas/registrar-pago (sin recargo)
  // - tarjeta/transferencia => /api/cuotas/pago-online (con recargo como el socio)
  const handleConfirmarPago = async () => {
    if (!selectedCuota || !metodoPago) {
      toast({ title: "Error", description: "Selecciona un método de pago.", variant: "destructive" })
      return
    }
    setProcessingPayment(true)
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
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err?.error || "No se pudo registrar el pago en efectivo.")
        }
        toast({ title: "Pago registrado", description: "Pago en efectivo cargado correctamente." })
      } else {
        const res = await fetch("/api/cuotas/pago-online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cuotaId: selectedCuota.IdCuota,
            metodoPago, // "tarjeta_credito", "tarjeta_debito", "transferencia" (ajusta si tu API espera otros valores)
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err?.error || "No se pudo procesar el pago online.")
        }
        const ok = await res.json()
        toast({
          title: "¡Pago online exitoso!",
          description: `Número de transacción: ${ok.numeroTransaccion ?? "—"}`,
        })
      }

      // refrescar cuotas pendientes
      if (selectedSocio) {
        const upd = await fetch(`/api/cuotas?socioId=${selectedSocio.IdSocio}&estado=0`)
        if (upd.ok) setCuotasPendientesSocio(await upd.json())
      }

      // cerrar diálogo
      setShowPaymentDialog(false)
      setSelectedCuota(null)
      setMetodoPago("")
      setCalculoRecargo(null)
    } catch (e: any) {
      console.error(e)
      toast({ title: "Error", description: e.message || "Ocurrió un problema al registrar el pago.", variant: "destructive" })
    } finally {
      setProcessingPayment(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount)

  const getEstadoBadge = (estado: number, fechaVencimiento: string) => {
    const fechaVenc = new Date(fechaVencimiento)
    const hoy = new Date()
    if (estado === 1) return <Badge className="bg-green-100 text-green-800">Pagada</Badge>
    if (fechaVenc < hoy) return <Badge className="bg-red-100 text-red-800">Vencida</Badge>
    return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
  }

  const handleSelectSocio = (socio: Socio) => {
    setSelectedSocio(socio)
    setSearchTerm("")
    setSelectedCuota(null)
    setMetodoPago("")
    setCalculoRecargo(null)
  }

  const handleVolver = () => router.push("/cuotas")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
            <Button variant="outline" onClick={handleVolver} className="flex items-center gap-2 bg-transparent">
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

        {/* Búsqueda de Socio */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Socio
            </CardTitle>
            <CardDescription>Busca por nombre, apellido o DNI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Label htmlFor="search">Nombre, apellido o DNI</Label>
                <Input
                  id="search"
                  placeholder="Ej: Juan Pérez o 12345678"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
                {loadingSocios && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-blue-500" />
                )}
              </div>

              {searchTerm.length >= 3 && sociosFiltrados.length > 0 && !selectedSocio && (
                <div className="border rounded-md bg-white max-h-48 overflow-y-auto">
                  {sociosFiltrados.map((socio) => (
                    <div
                      key={socio.IdSocio}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSelectSocio(socio)}
                    >
                      <div className="font-medium">
                        {socio.Nombre} {socio.Apellido}
                      </div>
                      <div className="text-sm text-gray-600">
                        DNI: {socio.DNI} — {socio.TipoMembresia}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchTerm.length >= 3 && sociosFiltrados.length === 0 && !loadingSocios && !selectedSocio && (
                <div className="p-3 text-center text-gray-500">No se encontraron socios.</div>
              )}

              {selectedSocio && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-green-900">
                        {selectedSocio.Nombre} {selectedSocio.Apellido}
                      </h3>
                      <p className="text-green-700">DNI: {selectedSocio.DNI}</p>
                      <p className="text-green-600 text-sm">{selectedSocio.TipoMembresia}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedSocio(null)} className="text-green-600">
                      Cambiar Socio
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cuotas Pendientes */}
        {selectedSocio && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Cuotas Pendientes
              </CardTitle>
              <CardDescription>
                Selecciona la cuota que deseas cobrar a {selectedSocio.Nombre} {selectedSocio.Apellido}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCuotas ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : cuotasPendientesSocio.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay cuotas pendientes para este socio.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotasPendientesSocio.map((cuota) => (
                      <TableRow key={cuota.IdCuota}>
                        <TableCell className="font-medium">{cuota.Periodo}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cuota.Monto)}</TableCell>
                        <TableCell>{new Date(cuota.FechaVencimiento).toLocaleDateString("es-AR")}</TableCell>
                        <TableCell>{getEstadoBadge(cuota.Estado, cuota.FechaVencimiento)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" onClick={() => handlePagarCuota(cuota)}>
                            <DollarSign className="h-4 w-4 mr-1" />
                            Cobrar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

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
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="tarjeta_debito">Tarjeta de Débito</SelectItem>
                      <SelectItem value="tarjeta_credito">Tarjeta de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                  {metodoPago === "efectivo" && (
                    <p className="text-xs text-gray-500">En efectivo no se aplica recargo.</p>
                  )}
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
