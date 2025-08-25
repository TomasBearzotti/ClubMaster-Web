"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Users,
  Search,
  CheckCircle,
  Loader2,
  CalendarDays,
  UserCheck,
  Info,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Torneo {
  IdTorneo: number
  Nombre: string
  Disciplina: string
  FechaInicio: string
  Estado: number // 0: Pendiente, 1: Activo, 2: Finalizado
  Participantes: number // This is TotalParticipantes from the API
}

interface Partido {
  id: number
  fecha: string
  hora: string
  equipoA: string
  equipoB: string
  fase: string
  lugar: string
  arbitro?: string
}

export default function GenerarFixturePage() {
  const router = useRouter()
  const [torneos, setTorneos] = useState<Torneo[]>([])
  const [loadingTorneos, setLoadingTorneos] = useState(true)
  const [errorTorneos, setErrorTorneos] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTorneo, setSelectedTorneo] = useState<Torneo | null>(null)
  const [tipoFixture, setTipoFixture] = useState("eliminacion")
  const [isGenerating, setIsGenerating] = useState(false)
  const [fixtureGenerado, setFixtureGenerado] = useState(false)
  const [activeTab, setActiveTab] = useState("calendario")

  useEffect(() => {
    const fetchTorneos = async () => {
      setLoadingTorneos(true)
      setErrorTorneos(null)
      try {
        const response = await fetch("/api/torneos")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setTorneos(data)
      } catch (error: any) {
        console.error("Error fetching torneos:", error)
        setErrorTorneos(`Error al cargar torneos: ${error.message}`)
      } finally {
        setLoadingTorneos(false)
      }
    }
    fetchTorneos()
  }, [])

  // Datos de ejemplo para los partidos generados (simulados, ya que no hay API de partidos aún)
  const partidosGenerados: Partido[] = [
    {
      id: 1,
      fecha: "2025-01-15",
      hora: "18:00",
      equipoA: "Los Tigres",
      equipoB: "Halcones FC",
      fase: "Octavos de Final",
      lugar: "Cancha 1",
    },
    {
      id: 2,
      fecha: "2025-01-15",
      hora: "19:30",
      equipoA: "Real Deportivo",
      equipoB: "Atlético Central",
      fase: "Octavos de Final",
      lugar: "Cancha 2",
    },
    {
      id: 3,
      fecha: "2025-01-16",
      hora: "18:00",
      equipoA: "Juventud Unida",
      equipoB: "Deportivo Norte",
      fase: "Octavos de Final",
      lugar: "Cancha 1",
    },
    {
      id: 4,
      fecha: "2025-01-16",
      hora: "19:30",
      equipoA: "Club Atlético Sur",
      equipoB: "Racing Club",
      fase: "Octavos de Final",
      lugar: "Cancha 2",
    },
    {
      id: 5,
      fecha: "2025-01-17",
      hora: "18:00",
      equipoA: "Independiente FC",
      equipoB: "Estudiantes",
      fase: "Octavos de Final",
      lugar: "Cancha 1",
    },
    {
      id: 6,
      fecha: "2025-01-17",
      hora: "19:30",
      equipoA: "Boca Juniors",
      equipoB: "River Plate",
      fase: "Octavos de Final",
      lugar: "Cancha 2",
    },
    {
      id: 7,
      fecha: "2025-01-18",
      hora: "18:00",
      equipoA: "San Lorenzo",
      equipoB: "Huracán",
      fase: "Octavos de Final",
      lugar: "Cancha 1",
    },
    {
      id: 8,
      fecha: "2025-01-18",
      hora: "19:30",
      equipoA: "Vélez Sarsfield",
      equipoB: "Argentinos Juniors",
      fase: "Octavos de Final",
      lugar: "Cancha 2",
    },
  ]

  const torneosFiltrados = torneos.filter((torneo) => torneo.Nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  const calcularPartidos = () => {
    if (!selectedTorneo) return 0

    const participantes = selectedTorneo.Participantes

    switch (tipoFixture) {
      case "eliminacion":
        return participantes > 0 ? participantes - 1 : 0 // En eliminación directa, el número de partidos es n-1
      case "todosContraTodos":
        return (participantes * (participantes - 1)) / 2 // Fórmula para todos contra todos
      case "grupos":
        // Asumiendo 4 grupos y luego eliminación directa entre los 2 primeros de cada grupo
        const equiposPorGrupo = Math.ceil(participantes / 4)
        const partidosGrupo = 4 * ((equiposPorGrupo * (equiposPorGrupo - 1)) / 2)
        const partidosEliminacion = 7 // Cuartos (4) + Semis (2) + Final (1)
        return partidosGrupo + partidosEliminacion
      default:
        return 0
    }
  }

  const handleSelectTorneo = (torneoId: string) => {
    const torneo = torneos.find((t) => t.IdTorneo.toString() === torneoId)
    setSelectedTorneo(torneo || null)
    setSearchTerm("")
    setFixtureGenerado(false)
  }

  const handleGenerarFixture = async () => {
    setIsGenerating(true)

    // Simular proceso de generación
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsGenerating(false)
    setFixtureGenerado(true)
  }

  const handleVolver = () => {
    router.push("/torneos")
  }

  const handleGestionArbitros = () => {
    router.push("/arbitros")
  }

  const getTipoFixtureLabel = () => {
    switch (tipoFixture) {
      case "eliminacion":
        return "Eliminación directa"
      case "todosContraTodos":
        return "Todos contra todos"
      case "grupos":
        return "Grupos + Eliminación"
      default:
        return ""
    }
  }

  const agruparPartidosPorFecha = () => {
    const partidos: { [key: string]: Partido[] } = {}

    partidosGenerados.forEach((partido) => {
      if (!partidos[partido.fecha]) {
        partidos[partido.fecha] = []
      }
      partidos[partido.fecha].push(partido)
    })

    return partidos
  }

  const partidosPorFecha = agruparPartidosPorFecha()

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
              Volver a Torneos
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            Generar Fixture de Torneo
          </h2>
          <p className="text-gray-600">Crea automáticamente el calendario de partidos para un torneo</p>
        </div>

        {/* Selección de Torneo */}
        {!fixtureGenerado && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Seleccionar Torneo
              </CardTitle>
              <CardDescription>Busca y selecciona el torneo para el cual deseas generar el fixture</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTorneos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">Cargando torneos...</span>
                </div>
              ) : errorTorneos ? (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Error al cargar</AlertTitle>
                  <AlertDescription>{errorTorneos}</AlertDescription>
                </Alert>
              ) : torneos.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No hay torneos disponibles.</div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Label htmlFor="select-torneo">Seleccionar Torneo</Label>
                    <Select onValueChange={handleSelectTorneo} value={selectedTorneo?.IdTorneo.toString() || ""}>
                      <SelectTrigger id="select-torneo" className="mt-1">
                        <SelectValue placeholder="Buscar y seleccionar torneo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {torneos.map((torneo) => (
                          <SelectItem key={torneo.IdTorneo} value={torneo.IdTorneo.toString()}>
                            {torneo.Nombre} - {torneo.Disciplina} ({torneo.Participantes} participantes)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Torneo seleccionado */}
                  {selectedTorneo && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-yellow-900">{selectedTorneo.Nombre}</h3>
                          <p className="text-yellow-800">Disciplina: {selectedTorneo.Disciplina}</p>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-4 w-4 text-yellow-700" />
                              <span>Inicio: {format(new Date(selectedTorneo.FechaInicio), "dd/MM/yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-4 w-4 text-yellow-700" />
                              <span>Participantes: {selectedTorneo.Participantes}</span>
                            </div>
                          </div>
                        </div>
                        {getEstadoTorneoBadge(selectedTorneo.Estado)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Configuración del Fixture */}
        {selectedTorneo && !fixtureGenerado && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Configuración del Fixture
              </CardTitle>
              <CardDescription>Selecciona el tipo de fixture que deseas generar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Tipo de Fixture</Label>
                <RadioGroup value={tipoFixture} onValueChange={setTipoFixture} className="space-y-3">
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="eliminacion" id="eliminacion" />
                    <Label htmlFor="eliminacion" className="flex-1 cursor-pointer">
                      <div className="font-medium">Eliminación directa</div>
                      <div className="text-sm text-gray-600">
                        Sistema de eliminación simple, el perdedor queda fuera del torneo
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="todosContraTodos" id="todosContraTodos" />
                    <Label htmlFor="todosContraTodos" className="flex-1 cursor-pointer">
                      <div className="font-medium">Todos contra todos</div>
                      <div className="text-sm text-gray-600">
                        Cada participante juega contra todos los demás una vez
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="grupos" id="grupos" />
                    <Label htmlFor="grupos" className="flex-1 cursor-pointer">
                      <div className="font-medium">Grupos + Eliminación</div>
                      <div className="text-sm text-gray-600">
                        Fase de grupos seguida de eliminación directa entre los clasificados
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Resumen de la generación</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-blue-700">Tipo de fixture</div>
                    <div className="font-medium">{getTipoFixtureLabel()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-700">Participantes</div>
                    <div className="font-medium">{selectedTorneo.Participantes}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-700">Partidos a generar</div>
                    <div className="font-medium">{calcularPartidos()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button
                onClick={handleGenerarFixture}
                disabled={isGenerating || selectedTorneo.Participantes === 0}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 text-lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generando Fixture...
                  </>
                ) : (
                  <>
                    <Trophy className="mr-2 h-5 w-5" />
                    Generar Fixture
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Fixture Generado */}
        {fixtureGenerado && (
          <>
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Fixture generado correctamente para el torneo{" "}
                <span className="font-semibold">{selectedTorneo?.Nombre}</span>.
              </AlertDescription>
            </Alert>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                      Fixture del Torneo: {selectedTorneo?.Nombre}
                    </CardTitle>
                    <CardDescription>
                      {calcularPartidos()} partidos generados con formato {getTipoFixtureLabel()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="calendario" className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Por Fecha
                    </TabsTrigger>
                    <TabsTrigger value="fases" className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Por Fase
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="calendario" className="mt-4">
                    {Object.keys(partidosPorFecha).map((fecha) => (
                      <div key={fecha} className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800">
                          <Calendar className="h-5 w-5" />
                          {format(new Date(fecha), "EEEE d 'de' MMMM", { locale: es })}
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Hora</TableHead>
                              <TableHead>Equipo Local</TableHead>
                              <TableHead>Equipo Visitante</TableHead>
                              <TableHead>Fase</TableHead>
                              <TableHead>Lugar</TableHead>
                              <TableHead>Árbitro</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {partidosPorFecha[fecha].map((partido) => (
                              <TableRow key={partido.id}>
                                <TableCell>{partido.hora}</TableCell>
                                <TableCell className="font-medium">{partido.equipoA}</TableCell>
                                <TableCell className="font-medium">{partido.equipoB}</TableCell>
                                <TableCell>{partido.fase}</TableCell>
                                <TableCell>{partido.lugar}</TableCell>
                                <TableCell>
                                  {partido.arbitro || (
                                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                                      Sin asignar
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="fases" className="mt-4">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800">
                        <Trophy className="h-5 w-5" />
                        Octavos de Final
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Hora</TableHead>
                            <TableHead>Equipo Local</TableHead>
                            <TableHead>Equipo Visitante</TableHead>
                            <TableHead>Lugar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {partidosGenerados.map((partido) => (
                            <TableRow key={partido.id}>
                              <TableCell>{format(new Date(partido.fecha), "dd/MM/yyyy")}</TableCell>
                              <TableCell>{partido.hora}</TableCell>
                              <TableCell className="font-medium">{partido.equipoA}</TableCell>
                              <TableCell className="font-medium">{partido.equipoB}</TableCell>
                              <TableCell>{partido.lugar}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4">
              <Button onClick={handleVolver} className="bg-blue-600 hover:bg-blue-700">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Volver al Menú de Torneos
              </Button>
              <Button onClick={handleGestionArbitros} variant="outline" className="border-purple-200 bg-transparent">
                <UserCheck className="mr-2 h-5 w-5 text-purple-600" />
                Ir a Gestión de Árbitros
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
