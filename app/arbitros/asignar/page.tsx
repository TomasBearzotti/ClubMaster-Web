"use client"

import { Label } from "@/components/ui/label"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, UserCheck, Calendar, Trophy, CheckCircle, User, Info, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Torneo {
  IdTorneo: number
  Nombre: string
  Disciplina: string
  FechaInicio: string
  Estado: number // 0: Pendiente, 1: Activo, 2: Finalizado
  Participantes: number
  DeporteId: number
  IdDeporte?: number // API might return IdDeporte instead
  NombreDeporte?: string
}

interface Partido {
  IdPartido: number // Changed from 'id' to match DB
  IdTorneo: number // Added to match DB
  FechaPartido: string // Changed from 'fecha' to match DB
  HoraPartido: string // Changed from 'hora' to match DB
  EquipoA: string // Changed from 'equipoA' to match DB
  EquipoB: string // Changed from 'equipoB' to match DB
  Fase: string // Changed from 'fase' to match DB
  Lugar: string // Changed from 'lugar' to match DB
  EstadoPartido: "programado" | "en_curso" | "finalizado" // Changed from 'estado' to match DB
  ArbitroId?: number | null // Changed from 'arbitroId' to match DB, added null
  ArbitroNombre?: string | null // Changed from 'arbitroNombre' to match DB, added null
}

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

export default function AsignarArbitroPage() {
  const router = useRouter()
  const [torneos, setTorneos] = useState<Torneo[]>([])
  const [arbitros, setArbitros] = useState<Arbitro[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [errorData, setErrorData] = useState<string | null>(null)

  const [selectedTorneoId, setSelectedTorneoId] = useState<string>("")
  const [selectedPartido, setSelectedPartido] = useState<Partido | null>(null)
  const [selectedArbitroId, setSelectedArbitroId] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [loadingPartidos, setLoadingPartidos] = useState(false)

  const fetchPartidos = useCallback(async (torneoId: string) => {
    setLoadingPartidos(true)
    try {
      const response = await fetch(`/api/partidos?torneoId=${torneoId}`)
      if (!response.ok) {
        throw new Error(`Error al cargar partidos: ${response.statusText}`)
      }
      const data: Partido[] = await response.json()
      setPartidos(data)
    } catch (error: any) {
      console.error("Error fetching partidos:", error)
      setErrorData(`Error al cargar partidos: ${error.message}`)
      setPartidos([])
    } finally {
      setLoadingPartidos(false)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      setErrorData(null)
      try {
        const [torneosRes, arbitrosRes] = await Promise.all([fetch("/api/torneos"), fetch("/api/arbitros")])

        if (!torneosRes.ok) throw new Error(`Error al cargar torneos: ${torneosRes.statusText}`)
        if (!arbitrosRes.ok) throw new Error(`Error al cargar árbitros: ${arbitrosRes.statusText}`)

        const torneosData: Torneo[] = await torneosRes.json()
        const arbitrosData: Arbitro[] = await arbitrosRes.json()

        setTorneos(torneosData)
        setArbitros(arbitrosData)
      } catch (error: any) {
        console.error("Error fetching initial data:", error)
        setErrorData(`Error al cargar datos iniciales: ${error.message}`)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedTorneoId) {
      fetchPartidos(selectedTorneoId)
    } else {
      setPartidos([])
    }
  }, [selectedTorneoId, fetchPartidos])

  const selectedTorneo = torneos.find((t) => t.IdTorneo.toString() === selectedTorneoId)

  const getArbitrosDisponibles = () => {
    // Retorna árbitros activos con tarifa configurada y que puedan arbitrar el deporte del torneo
    const deporteIdTorneo = selectedTorneo?.DeporteId || selectedTorneo?.IdDeporte
    return arbitros.filter((arbitro) => {
      const cumpleEstadoYTarifa = arbitro.Estado === 1 && arbitro.Tarifa && arbitro.Tarifa > 0
      const cumpleDeporte = deporteIdTorneo ? (arbitro.DeportesIds?.includes(deporteIdTorneo) ?? false) : true
      return cumpleEstadoYTarifa && cumpleDeporte
    })
  }

  const getEstadoPartidoBadge = (estado: string) => {
    switch (estado) {
      case "programado":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Programado</Badge>
      case "en_curso":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">En Curso</Badge>
      case "finalizado":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Finalizado</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const getEstadoTorneoBadge = (estado: number) => {
    switch (estado) {
      case 0: // Pendiente
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>
      case 1: // Activo
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
      case 2: // Finalizado
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Finalizado</Badge>
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  const handleTorneoChange = (value: string) => {
    setSelectedTorneoId(value)
    setShowSuccess(false)
  }

  const handleAsignarArbitro = (partido: Partido) => {
    setSelectedPartido(partido)
    setSelectedArbitroId(partido.ArbitroId ? partido.ArbitroId.toString() : "")
    setIsModalOpen(true)
  }

  const handleConfirmarAsignacion = async () => {
    if (!selectedPartido) return

    const arbitroIdToAssign = selectedArbitroId ? Number.parseInt(selectedArbitroId) : null

    try {
      const response = await fetch(`/api/partidos/${selectedPartido.IdPartido}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          arbitroId: arbitroIdToAssign,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al asignar árbitro")
      }

      // Update local state after successful API call
      setPartidos((prev) =>
        prev.map((partido) =>
          partido.IdPartido === selectedPartido.IdPartido
            ? {
                ...partido,
                ArbitroId: arbitroIdToAssign,
                ArbitroNombre: arbitros.find((a) => a.IdArbitro === arbitroIdToAssign)?.Nombre || null,
              }
            : partido,
        ),
      )

      setIsModalOpen(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error: any) {
      console.error("Error confirming assignment:", error)
      setErrorData(`Error al confirmar asignación: ${error.message}`)
      setIsModalOpen(false) // Close modal on error
    }
  }

  const handleVolver = () => {
    router.push("/arbitros")
  }

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-lg text-gray-600">Cargando datos para asignación de árbitros...</p>
        </div>
      </div>
    )
  }

  if (errorData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorData}</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={handleVolver} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Gestión de Árbitros
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
              Volver a Árbitros
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <UserCheck className="h-8 w-8 text-purple-600" />
            Asignar Árbitro a Partido
          </h2>
          <p className="text-gray-600">Asigna árbitros a los partidos programados en los torneos</p>
        </div>

        {/* Mensaje de éxito */}
        {showSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">Árbitro asignado correctamente al partido.</AlertDescription>
          </Alert>
        )}

        {/* Selección de Torneo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Seleccionar Torneo
            </CardTitle>
            <CardDescription>Elige el torneo para asignar árbitros a sus partidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Torneo con fixture generado</Label>
                <Select value={selectedTorneoId} onValueChange={handleTorneoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar torneo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {torneos.map((torneo) => (
                      <SelectItem key={torneo.IdTorneo} value={torneo.IdTorneo.toString()}>
                        {torneo.Nombre} - {torneo.Disciplina}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Información del torneo seleccionado */}
              {selectedTorneo && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <h3 className="font-semibold text-purple-900">{selectedTorneo.Nombre}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-purple-700" />
                      <span>Disciplina: {selectedTorneo.Disciplina}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-purple-700" />
                      <span>Inicio: {format(new Date(selectedTorneo.FechaInicio), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4 text-purple-700" />
                      <span>Participantes: {selectedTorneo.Participantes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-purple-700" />
                      <span>Estado: {getEstadoTorneoBadge(selectedTorneo.Estado)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Partidos */}
        {selectedTorneo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Partidos del Torneo
              </CardTitle>
              <CardDescription>Asigna árbitros a los partidos programados para {selectedTorneo.Nombre}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPartidos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">Cargando partidos...</span>
                </div>
              ) : partidos.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No hay partidos programados para este torneo.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Participante A</TableHead>
                      <TableHead>Participante B</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Árbitro Asignado</TableHead>
                      <TableHead className="text-center">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partidos.map((partido) => (
                      <TableRow key={partido.IdPartido}>
                        <TableCell>{format(new Date(partido.FechaPartido), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{partido.HoraPartido}</TableCell>
                        <TableCell className="font-medium">{partido.EquipoA}</TableCell>
                        <TableCell className="font-medium">{partido.EquipoB}</TableCell>
                        <TableCell>{partido.Fase}</TableCell>
                        <TableCell>{getEstadoPartidoBadge(partido.EstadoPartido)}</TableCell>
                        <TableCell>
                          {partido.ArbitroNombre ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {partido.ArbitroNombre.split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{partido.ArbitroNombre}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Sin asignar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAsignarArbitro(partido)}
                            disabled={partido.EstadoPartido !== "programado"}
                          >
                            {partido.ArbitroNombre ? "Cambiar" : "Asignar"}
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

        {/* Mensaje cuando no hay torneo seleccionado */}
        {!selectedTorneo && (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un torneo</h3>
              <p className="text-gray-600">Elige un torneo para ver sus partidos y asignar árbitros</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modal de Asignación de Árbitro */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              Asignar Árbitro al Partido
            </DialogTitle>
            <DialogDescription>
              {selectedPartido && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <div className="font-medium">
                    {selectedPartido.EquipoA} vs {selectedPartido.EquipoB}
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(selectedPartido.FechaPartido), "dd/MM/yyyy", { locale: es })} -{" "}
                    {selectedPartido.HoraPartido} - {selectedPartido.Lugar}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Árbitros disponibles</Label>
              <Select value={selectedArbitroId} onValueChange={setSelectedArbitroId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar árbitro..." />
                </SelectTrigger>
                <SelectContent>
                  {getArbitrosDisponibles().map((arbitro) => (
                    <SelectItem key={arbitro.IdArbitro} value={arbitro.IdArbitro.toString()}>
                      {arbitro.Nombre} - {arbitro.Email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Información del árbitro seleccionado */}
            {selectedArbitroId && (
              <div className="border rounded-md p-4 bg-purple-50">
                {(() => {
                  const arbitro = arbitros.find((a) => a.IdArbitro.toString() === selectedArbitroId)
                  if (!arbitro) return null

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {arbitro.Nombre.split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">{arbitro.Nombre}</h4>
                          <p className="text-sm text-gray-600">
                            Tarifa: <span className="font-medium text-purple-700">${arbitro.Tarifa?.toLocaleString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-sm">
                        <div className="font-medium text-purple-800 mb-1">Contacto:</div>
                        <div className="text-gray-600">
                          📞 {arbitro.Telefono || "N/A"} | ✉️ {arbitro.Email}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {getArbitrosDisponibles().length === 0 && selectedPartido && (
              <Alert>
                <AlertDescription>
                  No hay árbitros activos con tarifa configurada. Configura árbitros antes de asignar.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarAsignacion}
              disabled={!selectedArbitroId || getArbitrosDisponibles().length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Confirmar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
