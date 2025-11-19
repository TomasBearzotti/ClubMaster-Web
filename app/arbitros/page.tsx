"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, UserCheck, Plus, Search, Calendar, Info, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface Arbitro {
  IdArbitro: number
  Nombre: string
  Email: string
  Telefono: string
  Estado: number
  Tarifa: number | null
  Deportes?: string
  DeportesIds?: number[]
}

interface Disponibilidad {
  IdDisponibilidad: number
  IdArbitro: number
  DiaSemana: string
  HoraInicio: string
  HoraFin: string
}

export default function GestionArbitrosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [arbitros, setArbitros] = useState<Arbitro[]>([])
  const [disponibilidades, setDisponibilidades] = useState<Record<number, Disponibilidad[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [updatingEstado, setUpdatingEstado] = useState<number | null>(null)
  const [expandedArbitro, setExpandedArbitro] = useState<number | null>(null)

  const diasSemana = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]
  const diasSemanaDisplay: Record<string, string> = {
    "Lunes": "Lun",
    "Martes": "Mar",
    "Miercoles": "Mié",
    "Jueves": "Jue",
    "Viernes": "Vie",
    "Sabado": "Sáb",
    "Domingo": "Dom"
  }

  useEffect(() => {
    const fetchArbitros = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/arbitros")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: Arbitro[] = await response.json()
        setArbitros(data)
        
        // Fetch disponibilidades para cada árbitro
        const dispResponse = await fetch("/api/arbitros/disponibilidad")
        if (dispResponse.ok) {
          const dispData: Disponibilidad[] = await dispResponse.json()
          // Agrupar por IdArbitro
          const dispByArbitro: Record<number, Disponibilidad[]> = {}
          dispData.forEach((disp) => {
            if (!dispByArbitro[disp.IdArbitro]) {
              dispByArbitro[disp.IdArbitro] = []
            }
            dispByArbitro[disp.IdArbitro].push(disp)
          })
          setDisponibilidades(dispByArbitro)
        }
      } catch (error: any) {
        console.error("Error fetching arbitros:", error)
        setError(`Error al cargar árbitros: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchArbitros()
  }, [])

  const getEstadoBadge = (estado: number) => {
    if (estado === 1) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
    }
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inactivo</Badge>
  }

  const handleVolver = () => {
    router.push("/dashboard")
  }

  const handleAsignarArbitros = () => {
    router.push("/arbitros/asignar")
  }

  const handleToggleEstado = async (arbitro: Arbitro) => {
    const nuevoEstado = arbitro.Estado === 1 ? 0 : 1
    setUpdatingEstado(arbitro.IdArbitro)

    try {
      const response = await fetch(`/api/arbitros/${arbitro.IdArbitro}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Estado: nuevoEstado,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al actualizar estado")
      }

      // Actualizar localmente
      setArbitros((prev) =>
        prev.map((a) => (a.IdArbitro === arbitro.IdArbitro ? { ...a, Estado: nuevoEstado } : a))
      )

      toast({
        title: "Estado actualizado",
        description: `Árbitro marcado como ${nuevoEstado === 1 ? "Activo" : "Inactivo"}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del árbitro",
        variant: "destructive",
      })
    } finally {
      setUpdatingEstado(null)
    }
  }

  const filteredArbitros = arbitros.filter(
    (arbitro) =>
      arbitro.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitro.Email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculate statistics
  const totalArbitros = arbitros.length
  const arbitrosActivos = arbitros.filter((a) => a.Estado === 1).length
  const arbitrosConTarifa = arbitros.filter((a) => a.Tarifa && a.Tarifa > 0).length

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
              Volver al Menú
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <UserCheck className="h-8 w-8 text-purple-600" />
            Gestión de Árbitros
          </h2>
          <p className="text-gray-600">Administra los árbitros del club y sus asignaciones</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Árbitros</CardTitle>
              <UserCheck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{totalArbitros}</div>
              <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Disponibles</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{arbitrosActivos}</div>
              <p className="text-xs text-muted-foreground">Árbitros activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Tarifa</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{arbitrosConTarifa}</div>
              <p className="text-xs text-muted-foreground">Tarifa configurada</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
              <UserCheck className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalArbitros - arbitrosActivos}</div>
              <p className="text-xs text-muted-foreground">No disponibles</p>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button variant="outline" className="h-12 flex items-center gap-2 bg-transparent">
            <Plus className="h-5 w-5" />
            Nuevo Árbitro
          </Button>

          <Button
            onClick={handleAsignarArbitros}
            className="bg-purple-600 hover:bg-purple-700 h-12 flex items-center gap-2"
          >
            <UserCheck className="h-5 w-5" />
            Asignar a Partidos
          </Button>

          <Button
            onClick={() => router.push("/arbitros/facturacion")}
            className="bg-green-600 hover:bg-green-700 h-12 flex items-center gap-2"
          >
            <Calendar className="h-5 w-5" />
            Facturación
          </Button>
        </div>

        {/* Tabla de Árbitros */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Árbitros Registrados</CardTitle>
                <CardDescription>Lista de todos los árbitros del club</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar árbitro..."
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Cargando árbitros...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Error al cargar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : filteredArbitros.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No se encontraron árbitros.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead className="min-w-[200px]">Árbitro</TableHead>
                      <TableHead className="min-w-[250px]">Email</TableHead>
                      <TableHead className="min-w-[180px]">Deportes</TableHead>
                      <TableHead className="min-w-[120px]">Tarifa</TableHead>
                      <TableHead className="min-w-[100px]">Estado</TableHead>
                      <TableHead className="min-w-[150px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArbitros.map((arbitro) => {
                      const disponibilidad = disponibilidades[arbitro.IdArbitro] || []
                      const isExpanded = expandedArbitro === arbitro.IdArbitro
                      
                      return (
                        <>
                          <TableRow key={`${arbitro.IdArbitro}-row`}>
                            <TableCell className="w-[50px]">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-0 h-8 w-8"
                                onClick={() => setExpandedArbitro(isExpanded ? null : arbitro.IdArbitro)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="min-w-[200px]">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {arbitro.Nombre.split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{arbitro.Nombre}</span>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[250px] text-sm text-gray-600">
                              {arbitro.Email}
                            </TableCell>
                            <TableCell className="min-w-[180px]">
                              <div className="flex flex-wrap gap-1">
                                {arbitro.Deportes ? (
                                  arbitro.Deportes.split(', ').map((deporte, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {deporte}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400">Sin deportes</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              <span className="text-sm font-medium">
                                {arbitro.Tarifa ? `$${arbitro.Tarifa.toLocaleString()}` : "Sin configurar"}
                              </span>
                            </TableCell>
                            <TableCell className="min-w-[100px]">{getEstadoBadge(arbitro.Estado)}</TableCell>
                            <TableCell className="min-w-[150px] text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-sm text-gray-600">
                                  {arbitro.Estado === 1 ? "Activo" : "Inactivo"}
                                </span>
                                <Switch
                                  checked={arbitro.Estado === 1}
                                  onCheckedChange={() => handleToggleEstado(arbitro)}
                                  disabled={updatingEstado === arbitro.IdArbitro}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${arbitro.IdArbitro}-expanded`}>
                              <TableCell colSpan={6} className="p-0">
                                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-purple-600" />
                                      Disponibilidad Horaria
                                    </h4>
                                    {disponibilidad.length > 0 ? (
                                      <div className="space-y-3">
                                        <p className="text-sm text-gray-600">
                                          Disponible: <span className="font-medium">{disponibilidad.map((d: Disponibilidad) => diasSemanaDisplay[d.DiaSemana] || d.DiaSemana).join(", ")}</span>
                                        </p>
                                        <div className="grid grid-cols-7 gap-3">
                                          {diasSemana.map((dia) => {
                                            const diaDisponible = disponibilidad.find((d: Disponibilidad) => d.DiaSemana === dia)
                                            return (
                                              <div
                                                key={dia}
                                                className={`p-3 rounded-md border text-center transition-colors ${
                                                  diaDisponible
                                                    ? "bg-green-50 border-green-300"
                                                    : "bg-gray-50 border-gray-200"
                                                }`}
                                              >
                                                <div className={`text-xs font-bold mb-2 ${
                                                  diaDisponible ? "text-green-700" : "text-gray-400"
                                                }`}>
                                                  {diasSemanaDisplay[dia]}
                                                </div>
                                                {diaDisponible ? (
                                                  <div className="text-sm text-green-800 font-bold leading-snug">
                                                    <div>{diaDisponible.HoraInicio}</div>
                                                    <div className="text-xs text-gray-600 my-0.5">a</div>
                                                    <div>{diaDisponible.HoraFin}</div>
                                                  </div>
                                                ) : (
                                                  <div className="text-xs text-gray-400 mt-1">
                                                    No disp.
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 italic">
                                        No hay disponibilidad horaria configurada
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
