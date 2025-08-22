"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, UserCheck, Plus, Search, Star, Calendar, Info, Loader2 } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

interface Arbitro {
  IdArbitro: number
  Nombre: string
  Email: string
  Telefono: string
  Disponibilidad: string // e.g., "2025-01-15,2025-01-16"
  PartidosAsignados: number
  // Calificacion is not in DB schema, using a placeholder for display
  Calificacion: number
}

export default function GestionArbitrosPage() {
  const router = useRouter()
  const [arbitros, setArbitros] = useState<Arbitro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

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
        // Add placeholder for Calificacion as it's not in DB schema
        const arbitrosWithRating = data.map((a) => ({
          ...a,
          Calificacion: Math.floor(Math.random() * 20) / 10 + 3, // Random rating between 3.0 and 4.9
        }))
        setArbitros(arbitrosWithRating)
      } catch (error: any) {
        console.error("Error fetching arbitros:", error)
        setError(`Error al cargar árbitros: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchArbitros()
  }, [])

  const getEstadoBadge = (disponibilidad: string | null) => {
    if (!disponibilidad) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">No Disponible</Badge>
    }
    // Simple check: if availability string is not empty, assume available
    // A more robust solution would check current date against availability dates
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disponible</Badge>
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? "text-yellow-500 fill-current" : "text-gray-300"}`}
      />
    ))
  }

  const handleVolver = () => {
    router.push("/dashboard")
  }

  const handleAsignarArbitros = () => {
    router.push("/arbitros/asignar")
  }

  const filteredArbitros = arbitros.filter(
    (arbitro) =>
      arbitro.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arbitro.Email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculate statistics
  const totalArbitros = arbitros.length
  const arbitrosDisponibles = arbitros.filter((a) => a.Disponibilidad).length
  const totalPartidosAsignados = arbitros.reduce((sum, a) => sum + a.PartidosAsignados, 0)
  const promedioCalificacion =
    arbitros.length > 0 ? (arbitros.reduce((sum, a) => sum + a.Calificacion, 0) / arbitros.length).toFixed(1) : "N/A"

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
              <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Activos</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{arbitrosDisponibles}</div>
              <p className="text-xs text-muted-foreground">Listos para asignar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partidos Asignados</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalPartidosAsignados}</div>
              <p className="text-xs text-muted-foreground">En total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{promedioCalificacion}</div>
              <p className="text-xs text-muted-foreground">De 5 estrellas</p>
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

          <Button variant="outline" className="h-12 flex items-center gap-2 bg-transparent">
            <Calendar className="h-5 w-5" />
            Ver Disponibilidad
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Árbitro</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Disponibilidad</TableHead>
                    <TableHead>Calificación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Partidos Asignados</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArbitros.map((arbitro) => (
                    <TableRow key={arbitro.IdArbitro}>
                      <TableCell>
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
                      <TableCell className="text-sm text-gray-600">
                        {arbitro.Email}
                        <br />
                        {arbitro.Telefono || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {arbitro.Disponibilidad ? (
                            arbitro.Disponibilidad.split(",").map((disp, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {disp.trim()}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              No especificada
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {renderStars(arbitro.Calificacion)}
                          <span className="text-sm text-gray-600 ml-1">({arbitro.Calificacion.toFixed(1)})</span>
                        </div>
                      </TableCell>
                      <TableCell>{getEstadoBadge(arbitro.Disponibilidad)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{arbitro.PartidosAsignados}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/arbitros/editar/${arbitro.IdArbitro}`)}
                        >
                          Editar
                        </Button>
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
