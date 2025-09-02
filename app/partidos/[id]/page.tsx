"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Calendar, Clock, MapPin, User, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PartidoDetalle {
  IdPartido: number
  IdTorneo: number
  TorneoNombre: string
  FechaPartido: string
  HoraPartido: string
  EquipoA: string
  EquipoB: string
  Fase: string
  Lugar: string
  EstadoPartido: string
  ArbitroId?: number
  ArbitroNombre?: string
  ResultadoEquipoA?: number
  ResultadoEquipoB?: number
  Observaciones?: string
}

export default function PartidoDetallePage() {
  const router = useRouter()
  const params = useParams()
  const [partido, setPartido] = useState<PartidoDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const partidoId = params.id as string

  useEffect(() => {
    fetchPartidoDetalle()
  }, [partidoId])

  const fetchPartidoDetalle = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/partidos/${partidoId}`)
      if (!response.ok) {
        throw new Error(`Error al cargar partido: ${response.status}`)
      }
      const data = await response.json()
      setPartido(data)
    } catch (error: any) {
      console.error("Error fetching partido:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVolver = () => {
    router.back()
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "programado":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Programado</Badge>
      case "en_curso":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">En Curso</Badge>
      case "finalizado":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Finalizado</Badge>
      case "cancelado":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelado</Badge>
      case "suspendido":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Suspendido</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-gray-600">Cargando partido...</span>
        </div>
      </div>
    )
  }

  if (error || !partido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>{error || "Partido no encontrado"}</AlertDescription>
          </Alert>
        </main>
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            Detalles del Partido
          </h2>
          <p className="text-gray-600">Información completa del encuentro</p>
        </div>

        <div className="space-y-6">
          {/* Información Principal */}
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <CardDescription>{partido.TorneoNombre}</CardDescription>
              </div>
              <CardTitle className="text-2xl">
                {partido.EquipoA} vs {partido.EquipoB}
              </CardTitle>
              <div className="flex items-center justify-center gap-4 mt-4">
                <Badge variant="outline" className="text-sm">
                  {partido.Fase}
                </Badge>
                {getEstadoBadge(partido.EstadoPartido)}
              </div>
            </CardHeader>
            <CardContent>
              {/* Resultado */}
              {partido.ResultadoEquipoA !== undefined && partido.ResultadoEquipoB !== undefined && (
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {partido.ResultadoEquipoA} - {partido.ResultadoEquipoB}
                  </div>
                  <p className="text-gray-600">Resultado Final</p>
                </div>
              )}

              {/* Información del Partido */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-700">Fecha</h3>
                  </div>
                  <p className="text-gray-600">{format(new Date(partido.FechaPartido), "dd/MM/yyyy")}</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-700">Hora</h3>
                  </div>
                  <p className="text-gray-600">{partido.HoraPartido}</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-gray-700">Lugar</h3>
                  </div>
                  <p className="text-gray-600">{partido.Lugar}</p>
                </div>
              </div>

              {/* Árbitro */}
              {partido.ArbitroNombre && (
                <div className="mt-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <User className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-700">Árbitro</h3>
                  </div>
                  <p className="text-gray-600">{partido.ArbitroNombre}</p>
                </div>
              )}

              {/* Observaciones */}
              {partido.Observaciones && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Observaciones</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600">{partido.Observaciones}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Placeholder para futuras funcionalidades */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas del Partido</CardTitle>
              <CardDescription>Información adicional y estadísticas detalladas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Las estadísticas detalladas estarán disponibles próximamente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
