"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, User, DollarSign, XCircle, Info, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Cuota {
  IdCuota: number
  Mes: number
  Anio: number
  Monto: number
  Estado: number // 0: Pendiente, 1: Pagada, 2: Vencida
  FechaVencimiento: string
  FechaPago?: string
  Recargo?: number
  SocioId: number
  NombreSocio: string
  ApellidoSocio: string
  DniSocio: string
}

interface Socio {
  IdSocio: number
  Nombre: string
  Apellido: string
  Dni: string
  Email: string
  Telefono: string
  Estado: number
  DescripcionTipoMembresia: string
  MontoMensual: number
}

export default function SocioCuotasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const socioId = searchParams.get("id")

  const [socio, setSocio] = useState<Socio | null>(null)
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!socioId) {
      setError("ID de socio no proporcionado.")
      setLoading(false)
      return
    }

    const fetchSocioAndCuotas = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch socio details
        const socioResponse = await fetch(`/api/socios/${socioId}`)
        if (!socioResponse.ok) {
          throw new Error(`Error al cargar datos del socio: ${socioResponse.statusText}`)
        }
        const socioData = await socioResponse.json()
        setSocio(socioData)

        // Fetch cuotas for the socio
        const cuotasResponse = await fetch(`/api/cuotas?socioId=${socioId}`)
        if (!cuotasResponse.ok) {
          throw new Error(`Error al cargar cuotas del socio: ${cuotasResponse.statusText}`)
        }
        const cuotasData: Cuota[] = await cuotasResponse.json()

        // Determine 'Vencida' status client-side if not handled by API
        const now = new Date()
        const cuotasConEstado = cuotasData.map((cuota) => {
          const vencimiento = new Date(cuota.FechaVencimiento)
          let estadoTexto = ""
          let estadoValor = cuota.Estado // Assume API provides 0: Pendiente, 1: Pagada

          if (estadoValor === 1) {
            estadoTexto = "Pagada"
          } else if (estadoValor === 0 && vencimiento < now) {
            estadoTexto = "Vencida"
            estadoValor = 2 // Custom client-side state for Vencida
          } else {
            estadoTexto = "Pendiente"
          }

          return { ...cuota, Estado: estadoValor, EstadoTexto: estadoTexto }
        })

        setCuotas(cuotasConEstado as Cuota[])
      } catch (err: any) {
        console.error("Error fetching socio or cuotas:", err)
        setError(err.message || "Error desconocido al cargar la información.")
      } finally {
        setLoading(false)
      }
    }

    fetchSocioAndCuotas()
  }, [socioId])

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 1: // Pagada
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pagada</Badge>
      case 0: // Pendiente
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>
      case 2: // Vencida (client-side derived)
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Vencida</Badge>
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  const handleVolver = () => {
    router.push("/cuotas")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-lg text-gray-600">Cargando cuotas del socio...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={handleVolver} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Gestión de Cuotas
          </Button>
        </div>
      </div>
    )
  }

  if (!socio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Socio no encontrado</AlertTitle>
          <AlertDescription>No se pudo cargar la información del socio.</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={handleVolver} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Gestión de Cuotas
          </Button>
        </div>
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
              Volver a Cuotas
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <User className="h-8 w-8 text-blue-600" />
            Cuotas de {socio.Nombre} {socio.Apellido}
          </h2>
          <p className="text-gray-600">Historial de cuotas y pagos del socio</p>
        </div>

        {/* Información del Socio */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Datos del Socio
            </CardTitle>
            <CardDescription>Información detallada del socio y su membresía</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p>
                  <span className="font-medium">DNI:</span> {socio.Dni}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {socio.Email}
                </p>
              </div>
              <div>
                <p>
                  <span className="font-medium">Teléfono:</span> {socio.Telefono}
                </p>
                <p>
                  <span className="font-medium">Tipo de Membresía:</span> {socio.DescripcionTipoMembresia} (
                  {socio.MontoMensual ? `$${socio.MontoMensual.toFixed(2)}/mes` : "N/A"})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Cuotas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Historial de Cuotas
            </CardTitle>
            <CardDescription>Todas las cuotas generadas para este socio</CardDescription>
          </CardHeader>
          <CardContent>
            {cuotas.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No hay cuotas registradas para este socio.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Recargo</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fecha Vencimiento</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuotas.map((cuota) => (
                    <TableRow key={cuota.IdCuota}>
                      <TableCell className="font-medium">
                        {format(new Date(cuota.Anio, cuota.Mes - 1, 1), "MMMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>${cuota.Monto.toFixed(2)}</TableCell>
                      <TableCell>${(cuota.Recargo || 0).toFixed(2)}</TableCell>
                      <TableCell>${(cuota.Monto + (cuota.Recargo || 0)).toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(cuota.FechaVencimiento), "dd/MM/yyyy", { locale: es })}</TableCell>
                      <TableCell>
                        {cuota.FechaPago ? format(new Date(cuota.FechaPago), "dd/MM/yyyy", { locale: es }) : "N/A"}
                      </TableCell>
                      <TableCell>{getEstadoBadge(cuota.Estado)}</TableCell>
                      <TableCell className="text-right">
                        {cuota.Estado === 0 || cuota.Estado === 2 ? ( // Pendiente o Vencida
                          <Button variant="outline" size="sm">
                            Registrar Pago
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Ver Comprobante
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
