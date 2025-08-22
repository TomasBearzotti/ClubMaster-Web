"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, User, DollarSign, Loader2, CheckCircle, ArrowLeft, Info } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Socio {
  IdSocio: number
  Nombre: string
  Apellido: string
  Dni: string
  Email: string
  Telefono: string
  Estado: number
  TipoMembresiaId: number
  DescripcionTipoMembresia: string
  MontoMensual: number
}

export default function GenerarCuotasPage() {
  const router = useRouter()
  const [socios, setSocios] = useState<Socio[]>([])
  const [loadingSocios, setLoadingSocios] = useState(true)
  const [errorSocios, setErrorSocios] = useState<string | null>(null)

  const [mes, setMes] = useState<string>(format(new Date(), "MM"))
  const [anio, setAnio] = useState<string>(format(new Date(), "yyyy"))
  const [selectedSocios, setSelectedSocios] = useState<Set<number>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSocios = async () => {
      setLoadingSocios(true)
      setErrorSocios(null)
      try {
        const response = await fetch("/api/socios")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        // Filtrar solo socios activos (Estado = 1)
        const activeSocios = data.filter((socio: Socio) => socio.Estado === 1)
        setSocios(activeSocios)
      } catch (error: any) {
        console.error("Error fetching socios:", error)
        setErrorSocios(`Error al cargar socios: ${error.message}`)
      } finally {
        setLoadingSocios(false)
      }
    }
    fetchSocios()
  }, [])

  const handleSelectSocio = (socioId: number, isChecked: boolean) => {
    setSelectedSocios((prev) => {
      const newSet = new Set(prev)
      if (isChecked) {
        newSet.add(socioId)
      } else {
        newSet.delete(socioId)
      }
      return newSet
    })
  }

  const handleSelectAllSocios = (isChecked: boolean) => {
    if (isChecked) {
      const allSocioIds = new Set(socios.map((s) => s.IdSocio))
      setSelectedSocios(allSocioIds)
    } else {
      setSelectedSocios(new Set())
    }
  }

  const handleGenerarCuotas = async () => {
    if (selectedSocios.size === 0) {
      setGenerationError("Debes seleccionar al menos un socio para generar cuotas.")
      return
    }
    setIsGenerating(true)
    setGenerationSuccess(null)
    setGenerationError(null)

    try {
      const response = await fetch("/api/cuotas/generar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mes: Number.parseInt(mes),
          anio: Number.parseInt(anio),
          socioIds: Array.from(selectedSocios),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al generar cuotas.")
      }

      setGenerationSuccess(data.message || "Cuotas generadas exitosamente.")
      setSelectedSocios(new Set()) // Clear selection after successful generation
    } catch (error: any) {
      console.error("Error generating cuotas:", error)
      setGenerationError(error.message || "Ocurrió un error al generar las cuotas.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleVolver = () => {
    router.push("/cuotas")
  }

  const meses = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2000, i, 1)
    return { value: format(date, "MM"), label: format(date, "MMMM", { locale: es }) }
  })
  const anios = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() + i).toString())

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
            <DollarSign className="h-8 w-8 text-green-600" />
            Generar Cuotas Mensuales
          </h2>
          <p className="text-gray-600">Genera las cuotas de membresía para los socios del club</p>
        </div>

        {generationSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Éxito</AlertTitle>
            <AlertDescription className="text-green-800">{generationSuccess}</AlertDescription>
          </Alert>
        )}

        {generationError && (
          <Alert variant="destructive" className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{generationError}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Período de Cuotas
            </CardTitle>
            <CardDescription>Selecciona el mes y año para el cual deseas generar las cuotas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mes">Mes</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger id="mes">
                    <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="anio">Año</Label>
                <Select value={anio} onValueChange={setAnio}>
                  <SelectTrigger id="anio">
                    <SelectValue placeholder="Seleccionar año" />
                  </SelectTrigger>
                  <SelectContent>
                    {anios.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Socios Activos
            </CardTitle>
            <CardDescription>Selecciona los socios a los que se les generará la cuota</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSocios ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Cargando socios...</span>
              </div>
            ) : errorSocios ? (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Error al cargar</AlertTitle>
                <AlertDescription>{errorSocios}</AlertDescription>
              </Alert>
            ) : socios.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No hay socios activos para generar cuotas.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={selectedSocios.size === socios.length && socios.length > 0}
                        onCheckedChange={handleSelectAllSocios}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead>Socio</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Tipo Membresía</TableHead>
                    <TableHead className="text-right">Monto Mensual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {socios.map((socio) => (
                    <TableRow key={socio.IdSocio}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedSocios.has(socio.IdSocio)}
                          onCheckedChange={(checked) => handleSelectSocio(socio.IdSocio, checked as boolean)}
                          aria-label={`Seleccionar ${socio.Nombre} ${socio.Apellido}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {socio.Nombre} {socio.Apellido}
                      </TableCell>
                      <TableCell>{socio.Dni}</TableCell>
                      <TableCell>{socio.DescripcionTipoMembresia}</TableCell>
                      <TableCell className="text-right">
                        {socio.MontoMensual ? `$${socio.MontoMensual.toFixed(2)}` : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={handleGenerarCuotas}
              disabled={isGenerating || selectedSocios.size === 0 || loadingSocios}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generando Cuotas...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-5 w-5" />
                  Generar Cuotas
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
