"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Trophy,
  Users,
  Eye,
  UserPlus,
  UserMinus,
  Search,
  Filter,
  Calendar,
  Award,
  X,
  User,
  UsersIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Torneo {
  IdTorneo: number
  Nombre: string
  Descripcion: string
  NombreDeporte: string
  FechaInicio: string
  FechaFin?: string
  Estado: number
  MaxParticipantes?: number
  PremioGanador?: string
  ParticipantesActuales: number
}

interface Equipo {
  IdEquipo: number
  Nombre: string
  Disciplina: string
  CantidadIntegrantes: number
}

interface Participante {
  IdParticipante: number
  NombreEquipo: string 
  TipoParticipante: string 
  NombreReal: string 
  esEquipo: boolean
  socioId?: number
  equipoId?: number
}

interface MiInscripcion {
  inscrito: boolean
  participante?: {
    id: number
    nombre: string
    esEquipo: boolean
    equipoId?: number
    socioId?: number
  }
}

export default function TorneosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [torneos, setTorneos] = useState<Torneo[]>([])
  const [misEquipos, setMisEquipos] = useState<Equipo[]>([])
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [inscripciones, setInscripciones] = useState<Record<number, MiInscripcion>>({})
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showInscripcionDialog, setShowInscripcionDialog] = useState(false)
  const [showParticipantesDialog, setShowParticipantesDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDesinscripcionDialog, setShowDesinscripcionDialog] = useState(false)
  const [torneoSeleccionado, setTorneoSeleccionado] = useState<Torneo | null>(null)
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null)
  const [tipoInscripcion, setTipoInscripcion] = useState<"individual" | "equipo">("individual")

  // Filtros
  const [filtros, setFiltros] = useState({
    nombre: "",
    disciplina: "",
    estado: "",
  })

  const disciplinasDisponibles = [...new Set(torneos.map((t) => t.NombreDeporte))]

  // Funciones para determinar tipos de participación permitidos
  const permiteParticipacionIndividual = (disciplina: string): boolean => {
    const disciplinasIndividuales = [
      "tenis single",
      "tenis singles",
      "ping pong",
      "ajedrez",
      "natacion",
      "atletismo",
      "ciclismo",
      "boxeo",
      "karate",
      "judo",
      "taekwondo",
    ]

    return disciplinasIndividuales.some(
      (d) => disciplina.toLowerCase().includes(d) || d.includes(disciplina.toLowerCase()),
    )
  }

  const permiteParticipacionEquipos = (disciplina: string): boolean => {
    const disciplinasEquipos = [
      "futbol",
      "basquet",
      "voley",
      "handball",
      "hockey",
      "rugby",
      "tenis doble",
      "tenis dobles",
      "paddle",
    ]

    return disciplinasEquipos.some((d) => disciplina.toLowerCase().includes(d) || d.includes(disciplina.toLowerCase()))
  }

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
    setCurrentUser(user)
    fetchTorneos()
    fetchMisEquipos(user.socioId)
  }, [router])

  useEffect(() => {
    if (currentUser && torneos.length > 0) {
      checkInscripciones()
    }
  }, [currentUser, torneos])

  const fetchTorneos = async () => {
    try {
      const response = await fetch("/api/torneos/publicos")
      if (response.ok) {
        const data = await response.json()
        setTorneos(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los torneos.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching torneos:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los torneos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMisEquipos = async (socioId: number) => {
    try {
      const response = await fetch(`/api/equipos?socioId=${socioId}`)
      if (response.ok) {
        const data = await response.json()
        setMisEquipos(data)
      }
    } catch (error) {
      console.error("Error fetching equipos:", error)
    }
  }

const checkInscripciones = async () => {
    if (!currentUser) return

    const inscripcionesMap: Record<number, MiInscripcion> = {}

    for (const torneo of torneos) {
      try {
        const response = await fetch(`/api/torneos/${torneo.IdTorneo}/mi-inscripcion?socioId=${currentUser.socioId}`)
        if (response.ok) {
          const data = await response.json()
          inscripcionesMap[torneo.IdTorneo] = data
        }
      } catch (error) {
        console.error(`Error checking inscripción for torneo ${torneo.IdTorneo}:`, error)
      }
    }

    setInscripciones(inscripcionesMap)
  }

// También modifica la función que renderiza los botones para debug:
const renderBotonesAccion = (torneo: Torneo) => {
  const miInscripcion = inscripciones[torneo.IdTorneo]
  const estoyInscrito = miInscripcion?.inscrito || false
  
  console.log(`🎮 Renderizando botones para torneo ${torneo.IdTorneo}:`, {
    miInscripcion,
    estoyInscrito,
    torneoEstado: torneo.Estado
  })

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => handleVerParticipantes(torneo)}>
        <Eye className="h-4 w-4 mr-1" />
        Ver Participantes
      </Button>
      {torneo.Estado === 0 && (
        <>
          {estoyInscrito ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDesinscribirClick(torneo)}
            >
              <UserMinus className="h-4 w-4 mr-1" />
              Desinscribirse
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleInscribirClick(torneo)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Inscribirse
            </Button>
          )}
        </>
      )}
    </div>
  )
}

  const fetchParticipantes = async (torneoId: number) => {
  try {
    const response = await fetch(`/api/torneos/${torneoId}/participantes`)
    if (response.ok) {
      const data = await response.json()
      console.log('🎯 Participantes recibidos:', data)
      setParticipantes(data)
    } else {
      console.error('❌ Error en response:', response.status)
      toast({
        title: "Error",
        description: "No se pudieron cargar los participantes.",
        variant: "destructive",
      })
    }
  } catch (error) {
    console.error("❌ Error fetching participantes:", error)
    toast({
      title: "Error",
      description: "Ocurrió un error al cargar los participantes.",
      variant: "destructive",
    })
  }
}

  const handleInscribir = async () => {
    if (!torneoSeleccionado) return

    if (tipoInscripcion === "equipo" && !equipoSeleccionado) {
      toast({
        title: "Error",
        description: "Selecciona un equipo para inscribir.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/torneos/${torneoSeleccionado.IdTorneo}/inscribir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equipoId: tipoInscripcion === "equipo" ? equipoSeleccionado : null,
          socioId: currentUser.socioId,
          tipoInscripcion: tipoInscripcion,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Éxito",
          description: result.message,
        })
        setShowInscripcionDialog(false)
        setShowConfirmDialog(false)
        setEquipoSeleccionado(null)
        setTipoInscripcion("individual")
        fetchTorneos()
        checkInscripciones()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al inscribir.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error inscribiendo:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al inscribir.",
        variant: "destructive",
      })
    }
  }

  const handleDesinscribir = async () => {
    if (!torneoSeleccionado) return

    try {
      const response = await fetch(
        `/api/torneos/${torneoSeleccionado.IdTorneo}/desinscribir?socioId=${currentUser.socioId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Éxito",
          description: result.message,
        })
        setShowDesinscripcionDialog(false)
        fetchTorneos()
        checkInscripciones()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al desinscribir.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error desinscribiendo:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al desinscribir.",
        variant: "destructive",
      })
    }
  }

  const handleVerParticipantes = (torneo: Torneo) => {
    setTorneoSeleccionado(torneo)
    fetchParticipantes(torneo.IdTorneo)
    setShowParticipantesDialog(true)
  }

  const handleInscribirClick = (torneo: Torneo) => {
    setTorneoSeleccionado(torneo)

    // Determinar el tipo de inscripción por defecto
    const permiteIndividual = permiteParticipacionIndividual(torneo.NombreDeporte)
    const permiteEquipos = permiteParticipacionEquipos(torneo.NombreDeporte)

    if (permiteIndividual && !permiteEquipos) {
      setTipoInscripcion("individual")
    } else if (!permiteIndividual && permiteEquipos) {
      setTipoInscripcion("equipo")
    } else {
      setTipoInscripcion("individual") // Por defecto individual si permite ambos
    }

    setShowInscripcionDialog(true)
  }

  const handleDesinscribirClick = (torneo: Torneo) => {
    setTorneoSeleccionado(torneo)
    setShowDesinscripcionDialog(true)
  }

  const limpiarFiltros = () => {
    setFiltros({ nombre: "", disciplina: "", estado: "" })
  }

  const torneosFiltrados = torneos.filter((torneo) => {
    const matchNombre = torneo.Nombre.toLowerCase().includes(filtros.nombre.toLowerCase())
    const matchDisciplina =
      !filtros.disciplina || filtros.disciplina === "all" || torneo.NombreDeporte === filtros.disciplina
    const matchEstado = !filtros.estado || filtros.estado === "all" || torneo.Estado.toString() === filtros.estado
    return matchNombre && matchDisciplina && matchEstado
  })

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
      case 1:
        return <Badge className="bg-green-100 text-green-800">Activo</Badge>
      case 2:
        return <Badge className="bg-blue-100 text-blue-800">Finalizado</Badge>
      case 3:
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  const equiposCompatibles = misEquipos.filter(
    (equipo) =>
      !torneoSeleccionado || equipo.Disciplina.toLowerCase() === torneoSeleccionado.NombreDeporte.toLowerCase(),
  )

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-blue-600" />
            Torneos Disponibles
          </h2>
          <p className="text-gray-600">Explora y participa en los torneos del club</p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar por nombre</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Nombre del torneo..."
                    value={filtros.nombre}
                    onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Disciplina</label>
                <Select
                  value={filtros.disciplina}
                  onValueChange={(value) => setFiltros({ ...filtros, disciplina: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las disciplinas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las disciplinas</SelectItem>
                    {disciplinasDisponibles.map((disciplina) => (
                      <SelectItem key={disciplina} value={disciplina}>
                        {disciplina}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select value={filtros.estado} onValueChange={(value) => setFiltros({ ...filtros, estado: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="0">Pendiente</SelectItem>
                    <SelectItem value="1">Activo</SelectItem>
                    <SelectItem value="2">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={limpiarFiltros} className="w-full bg-transparent">
                  <X className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Torneos */}
        <Card>
          <CardHeader>
            <CardTitle>Torneos ({torneosFiltrados.length})</CardTitle>
            <CardDescription>
              {torneosFiltrados.length === 0
                ? "No hay torneos que coincidan con los filtros"
                : "Lista de torneos disponibles"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {torneosFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay torneos disponibles</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {torneosFiltrados.map((torneo) => {
                  const miInscripcion = inscripciones[torneo.IdTorneo]
                  const estoyInscrito = miInscripcion?.inscrito || false

                  return (
                    <Card
                      key={torneo.IdTorneo}
                      className={`border-l-4 ${estoyInscrito ? "border-l-green-500 bg-green-50" : "border-l-blue-500"}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">{torneo.Nombre}</h3>
                              {estoyInscrito && (
                                <Badge className="bg-green-100 text-green-800">
                                  {miInscripcion.participante?.esEquipo ? "Inscrito (Equipo)" : "Inscrito (Individual)"}
                                </Badge>
                              )}
                            </div>
                            {torneo.Descripcion && <p className="text-gray-600 mb-2">{torneo.Descripcion}</p>}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Trophy className="h-4 w-4" />
                                {torneo.NombreDeporte}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(torneo.FechaInicio).toLocaleDateString("es-AR")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {torneo.ParticipantesActuales}
                                {torneo.MaxParticipantes && `/${torneo.MaxParticipantes}`} participantes
                              </span>
                              {torneo.PremioGanador && (
                                <span className="flex items-center gap-1">
                                  <Award className="h-4 w-4" />
                                  {torneo.PremioGanador}
                                </span>
                              )}
                            </div>

                            {/* Mostrar tipos de participación permitidos */}
                            <div className="flex items-center gap-2 mt-2">
                              {permiteParticipacionIndividual(torneo.NombreDeporte) && (
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  Individual
                                </Badge>
                              )}
                              {permiteParticipacionEquipos(torneo.NombreDeporte) && (
                                <Badge variant="outline" className="text-xs">
                                  <UsersIcon className="h-3 w-3 mr-1" />
                                  Equipos
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getEstadoBadge(torneo.Estado)}
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleVerParticipantes(torneo)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Participantes
                              </Button>
                              {torneo.Estado === 0 && (
                                <>
                                  {estoyInscrito ? (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDesinscribirClick(torneo)}
                                    >
                                      <UserMinus className="h-4 w-4 mr-1" />
                                      Desinscribirse
                                    </Button>
                                  ) : (
                                    <Button size="sm" onClick={() => handleInscribirClick(torneo)}>
                                      <UserPlus className="h-4 w-4 mr-1" />
                                      Inscribirse
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Inscripción */}
        <Dialog open={showInscripcionDialog} onOpenChange={setShowInscripcionDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Inscribirse al Torneo</DialogTitle>
              <DialogDescription>
                Selecciona cómo quieres participar en el torneo "{torneoSeleccionado?.Nombre}"
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {torneoSeleccionado && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Detalles del Torneo:</h4>
                  <p className="text-sm text-gray-600">
                    <strong>Disciplina:</strong> {torneoSeleccionado.NombreDeporte}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Fecha:</strong> {new Date(torneoSeleccionado.FechaInicio).toLocaleDateString("es-AR")}
                  </p>
                  {torneoSeleccionado.MaxParticipantes && (
                    <p className="text-sm text-gray-600">
                      <strong>Cupos:</strong> {torneoSeleccionado.ParticipantesActuales}/
                      {torneoSeleccionado.MaxParticipantes}
                    </p>
                  )}
                </div>
              )}

              {/* Selector de tipo de inscripción */}
              {torneoSeleccionado && (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-3 block">Tipo de participación:</label>
                  <RadioGroup
                    value={tipoInscripcion}
                    onValueChange={(value: "individual" | "equipo") => setTipoInscripcion(value)}
                  >
                    {permiteParticipacionIndividual(torneoSeleccionado.NombreDeporte) && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="individual" id="individual" />
                        <Label htmlFor="individual" className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Participación Individual
                        </Label>
                      </div>
                    )}
                    {permiteParticipacionEquipos(torneoSeleccionado.NombreDeporte) && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="equipo" id="equipo" />
                        <Label htmlFor="equipo" className="flex items-center gap-2">
                          <UsersIcon className="h-4 w-4" />
                          Participación por Equipo
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              )}

              {/* Selector de equipo (solo si es participación por equipo) */}
              {tipoInscripcion === "equipo" && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Selecciona tu equipo:</label>
                  {equiposCompatibles.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-2">
                        No tienes equipos compatibles con la disciplina "{torneoSeleccionado?.NombreDeporte}"
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => router.push("/socio/equipos")}
                        className="bg-transparent"
                      >
                        Crear Equipo
                      </Button>
                    </div>
                  ) : (
                    equiposCompatibles.map((equipo) => (
                      <div
                        key={equipo.IdEquipo}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          equipoSeleccionado === equipo.IdEquipo
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setEquipoSeleccionado(equipo.IdEquipo)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{equipo.Nombre}</p>
                            <p className="text-sm text-gray-500">{equipo.CantidadIntegrantes} integrantes</p>
                          </div>
                          <div className="w-4 h-4 border-2 border-blue-500 rounded-full flex items-center justify-center">
                            {equipoSeleccionado === equipo.IdEquipo && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tipoInscripcion === "individual" && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">Te inscribirás como participante individual en este torneo.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInscripcionDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={tipoInscripcion === "equipo" && !equipoSeleccionado}
              >
                Inscribirse
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Confirmación Inscripción */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Inscripción</AlertDialogTitle>
              <AlertDialogDescription>
                {tipoInscripcion === "individual"
                  ? `¿Estás seguro de que quieres inscribirte individualmente al torneo "${torneoSeleccionado?.Nombre}"?`
                  : `¿Estás seguro de que quieres inscribir tu equipo al torneo "${torneoSeleccionado?.Nombre}"?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleInscribir}>Confirmar Inscripción</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog Confirmación Desinscripción */}
        <AlertDialog open={showDesinscripcionDialog} onOpenChange={setShowDesinscripcionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Desinscripción</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres desinscribirte del torneo "{torneoSeleccionado?.Nombre}"? Esta acción
                eliminará tu participación del torneo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDesinscribir} className="bg-red-600 hover:bg-red-700">
                Confirmar Desinscripción
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog Participantes */}
        <Dialog open={showParticipantesDialog} onOpenChange={setShowParticipantesDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Participantes del Torneo</DialogTitle>
              <DialogDescription>Lista de participantes inscritos en "{torneoSeleccionado?.Nombre}"</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {participantes.length === 0 ? (
                <div className="text-center py-4">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay participantes inscritos aún</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Participante</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nombre Real</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participantes.map((participante) => (
                      <TableRow key={participante.IdParticipante}>
                        <TableCell className="font-medium">
                          {participante.TipoParticipante === "Equipo"
                          ? participante.NombreEquipo
                          : participante.NombreReal}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {participante.TipoParticipante === "Equipo" ? (
                              <UsersIcon className="h-3 w-3" />
                            ) : (
                              <User className="h-3 w-3" />
                            )}
                            {participante.TipoParticipante}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {participante.TipoParticipante === "Individual"
                          ? participante.NombreReal
                          : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowParticipantesDialog(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
