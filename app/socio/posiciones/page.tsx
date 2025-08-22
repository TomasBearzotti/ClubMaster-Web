"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Calendar, Medal, Target } from "lucide-react"

interface Torneo {
  id: number
  nombre: string
  deporte: string
  tipo: string
}

interface Posicion {
  posicion: number
  equipo: string
  puntos: number
  partidosJugados: number
  ganados: number
  empatados: number
  perdidos: number
  diferencia: number
  esUsuario?: boolean
}

export default function TablaPosicionesPage() {
  const router = useRouter()
  const [selectedTorneo, setSelectedTorneo] = useState<string>("")

  // Datos de ejemplo de torneos donde participa el socio
  const torneosParticipante: Torneo[] = [
    { id: 1, nombre: "Torneo de Fútbol 5 - Verano 2025", deporte: "Fútbol 5", tipo: "Todos contra todos" },
    { id: 2, nombre: "Copa Tenis Club - 2025", deporte: "Tenis", tipo: "Eliminación directa" },
    { id: 3, nombre: "Torneo de Básquet 3x3", deporte: "Básquet", tipo: "Grupos + Eliminación" },
  ]

  // Datos de ejemplo de posiciones
  const posicionesData: { [key: string]: Posicion[] } = {
    "1": [
      {
        posicion: 1,
        equipo: "Real Deportivo",
        puntos: 18,
        partidosJugados: 8,
        ganados: 6,
        empatados: 0,
        perdidos: 2,
        diferencia: 12,
      },
      {
        posicion: 2,
        equipo: "Los Tigres",
        puntos: 15,
        partidosJugados: 8,
        ganados: 5,
        empatados: 0,
        perdidos: 3,
        diferencia: 8,
        esUsuario: true,
      },
      {
        posicion: 3,
        equipo: "Atlético Central",
        puntos: 12,
        partidosJugados: 8,
        ganados: 4,
        empatados: 0,
        perdidos: 4,
        diferencia: 3,
      },
      {
        posicion: 4,
        equipo: "Halcones FC",
        puntos: 9,
        partidosJugados: 8,
        ganados: 3,
        empatados: 0,
        perdidos: 5,
        diferencia: -2,
      },
      {
        posicion: 5,
        equipo: "Juventud Unida",
        puntos: 6,
        partidosJugados: 8,
        ganados: 2,
        empatados: 0,
        perdidos: 6,
        diferencia: -8,
      },
      {
        posicion: 6,
        equipo: "Deportivo Norte",
        puntos: 3,
        partidosJugados: 8,
        ganados: 1,
        empatados: 0,
        perdidos: 7,
        diferencia: -13,
      },
    ],
    "2": [
      {
        posicion: 1,
        equipo: "Juan Pérez",
        puntos: 0,
        partidosJugados: 3,
        ganados: 3,
        empatados: 0,
        perdidos: 0,
        diferencia: 6,
        esUsuario: true,
      },
      {
        posicion: 2,
        equipo: "Carlos López",
        puntos: 0,
        partidosJugados: 3,
        ganados: 2,
        empatados: 0,
        perdidos: 1,
        diferencia: 2,
      },
      {
        posición: 3,
        equipo: "Ana Martínez",
        puntos: 0,
        partidosJugados: 2,
        ganados: 1,
        empatados: 0,
        perdidos: 1,
        diferencia: 0,
      },
      {
        posicion: 4,
        equipo: "Luis Torres",
        puntos: 0,
        partidosJugados: 2,
        ganados: 0,
        empatados: 0,
        perdidos: 2,
        diferencia: -4,
      },
    ],
  }

  const selectedTorneoData = torneosParticipante.find((t) => t.id.toString() === selectedTorneo)
  const posiciones = selectedTorneo ? posicionesData[selectedTorneo] || [] : []

  const getPosicionBadge = (posicion: number) => {
    if (posicion === 1) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">🥇 1°</Badge>
    if (posicion === 2) return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">🥈 2°</Badge>
    if (posicion === 3) return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🥉 3°</Badge>
    return <Badge variant="outline">{posicion}°</Badge>
  }

  const handleVolver = () => {
    router.push("/dashboard")
  }

  const handleVerFixture = () => {
    if (selectedTorneoData) {
      // Navegar al fixture del torneo
      router.push(`/torneos/${selectedTorneo}/fixture`)
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
            <Button variant="outline" onClick={handleVolver} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            Tabla de Posiciones
          </h2>
          <p className="text-gray-600">Consulta tu posición en los torneos donde participas</p>
        </div>

        {/* Selección de Torneo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5" />
              Mis Torneos
            </CardTitle>
            <CardDescription>Selecciona un torneo para ver la tabla de posiciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select value={selectedTorneo} onValueChange={setSelectedTorneo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar torneo..." />
                </SelectTrigger>
                <SelectContent>
                  {torneosParticipante.map((torneo) => (
                    <SelectItem key={torneo.id} value={torneo.id.toString()}>
                      {torneo.nombre} - {torneo.deporte}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Información del torneo seleccionado */}
              {selectedTorneoData && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-yellow-900">{selectedTorneoData.nombre}</h3>
                      <p className="text-yellow-800">Deporte: {selectedTorneoData.deporte}</p>
                      <p className="text-yellow-700 text-sm">Modalidad: {selectedTorneoData.tipo}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleVerFixture} className="text-yellow-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      Ver Fixture
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Posiciones */}
        {selectedTorneo && posiciones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Posiciones - {selectedTorneoData?.nombre}
              </CardTitle>
              <CardDescription>
                {selectedTorneoData?.deporte === "Tenis"
                  ? "Clasificación por sets ganados"
                  : "Clasificación por puntos obtenidos"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Pos.</TableHead>
                      <TableHead>{selectedTorneoData?.deporte === "Tenis" ? "Jugador" : "Equipo"}</TableHead>
                      <TableHead className="text-center">
                        {selectedTorneoData?.deporte === "Tenis" ? "Sets" : "Pts"}
                      </TableHead>
                      <TableHead className="text-center">PJ</TableHead>
                      <TableHead className="text-center">G</TableHead>
                      <TableHead className="text-center">E</TableHead>
                      <TableHead className="text-center">P</TableHead>
                      <TableHead className="text-center">
                        {selectedTorneoData?.deporte === "Tenis" ? "Dif. Sets" : "Dif. Gol"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posiciones.map((pos) => (
                      <TableRow key={pos.posicion} className={pos.esUsuario ? "bg-blue-50 border-blue-200" : ""}>
                        <TableCell>{getPosicionBadge(pos.posicion)}</TableCell>
                        <TableCell className={`font-medium ${pos.esUsuario ? "text-blue-900" : ""}`}>
                          {pos.equipo}
                          {pos.esUsuario && (
                            <Badge variant="outline" className="ml-2 text-xs text-blue-600 border-blue-300">
                              Tú
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-semibold">{pos.puntos}</TableCell>
                        <TableCell className="text-center">{pos.partidosJugados}</TableCell>
                        <TableCell className="text-center text-green-600">{pos.ganados}</TableCell>
                        <TableCell className="text-center text-gray-600">{pos.empatados}</TableCell>
                        <TableCell className="text-center text-red-600">{pos.perdidos}</TableCell>
                        <TableCell
                          className={`text-center font-medium ${
                            pos.diferencia > 0
                              ? "text-green-600"
                              : pos.diferencia < 0
                                ? "text-red-600"
                                : "text-gray-600"
                          }`}
                        >
                          {pos.diferencia > 0 ? `+${pos.diferencia}` : pos.diferencia}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Leyenda */}
              <div className="mt-4 text-xs text-gray-600 space-y-1">
                <p>
                  <strong>PJ:</strong> Partidos Jugados | <strong>G:</strong> Ganados | <strong>E:</strong> Empatados |{" "}
                  <strong>P:</strong> Perdidos
                </p>
                <p>
                  <strong>Dif. Gol/Sets:</strong> Diferencia de goles o sets a favor/en contra
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensaje cuando no hay torneo seleccionado */}
        {!selectedTorneo && (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un torneo</h3>
              <p className="text-gray-600">Elige uno de tus torneos para ver la tabla de posiciones actual</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
