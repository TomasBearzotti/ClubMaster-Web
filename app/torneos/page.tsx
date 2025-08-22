"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Trophy, Plus, Search, Calendar, Users, Info, Loader2, Edit, Trash2, FileText } from "lucide-react"
import { format } from "date-fns"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface Torneo {
  IdTorneo: number
  Nombre: string
  Disciplina: string
  FechaInicio: string
  Estado: number // 0: Pendiente, 1: Activo, 2: Finalizado, 3: Cancelado
  Participantes: number
}

interface Deporte {
  IdDeporte: number
  Nombre: string
}

export default function GestionTorneosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [torneos, setTorneos] = useState<Torneo[]>([])
  const [deportes, setDeportes] = useState<Deporte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state for new tournament
  const [formData, setFormData] = useState({
    nombre: "",
    disciplina: "",
    fechaInicio: "",
    fechaFin: "",
    descripcion: "",
    maxParticipantes: "",
    premioGanador: "",
  })

  useEffect(() => {
    fetchTorneos()
    fetchDeportes()
  }, [])

  const fetchTorneos = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/torneos")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setTorneos(data)
    } catch (error: any) {
      console.error("Error fetching torneos:", error)
      setError(`Error al cargar torneos: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchDeportes = async () => {
    try {
      const response = await fetch("/api/deportes")
      if (response.ok) {
        const data = await response.json()
        setDeportes(data)
      }
    } catch (error) {
      console.error("Error fetching deportes:", error)
    }
  }

  const handleCreateTorneo = async () => {
    if (!formData.nombre || !formData.disciplina || !formData.fechaInicio) {
      toast({
        title: "Error",
        description: "Nombre, disciplina y fecha de inicio son requeridos.",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/torneos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          disciplina: formData.disciplina,
          fechaInicio: formData.fechaInicio,
          fechaFin: formData.fechaFin || null,
          descripcion: formData.descripcion || null,
          maxParticipantes: formData.maxParticipantes ? Number.parseInt(formData.maxParticipantes) : null,
          premioGanador: formData.premioGanador || null,
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Torneo creado exitosamente.",
        })
        setShowCreateDialog(false)
        setFormData({
          nombre: "",
          disciplina: "",
          fechaInicio: "",
          fechaFin: "",
          descripcion: "",
          maxParticipantes: "",
          premioGanador: "",
        })
        fetchTorneos()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al crear el torneo.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error creating torneo:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el torneo.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleCancelarTorneo = async (torneoId: number) => {
    try {
      const response = await fetch(`/api/torneos/${torneoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: 3 }), // 3 = Cancelado
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Torneo cancelado exitosamente.",
        })
        fetchTorneos()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al cancelar el torneo.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error canceling torneo:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al cancelar el torneo.",
        variant: "destructive",
      })
    }
  }

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0: // Pendiente
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>
      case 1: // Activo
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
      case 2: // Finalizado
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Finalizado</Badge>
      case 3: // Cancelado
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelado</Badge>
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  const handleVolver = () => {
    router.push("/dashboard")
  }

  const handleGenerarFixture = () => {
    router.push("/torneos/fixture")
  }

  const handleRegistrarResultados = () => {
    router.push("/torneos/resultados")
  }

  const filteredTorneos = torneos.filter(
    (torneo) =>
      torneo.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      torneo.Disciplina.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculate statistics
  const totalTorneos = torneos.length
  const torneosActivos = torneos.filter((t) => t.Estado === 1).length
  const proximosTorneos = torneos.filter((t) => t.Estado === 0 && new Date(t.FechaInicio) > new Date()).length
  const participantesTotales = torneos.reduce((sum, t) => sum + t.Participantes, 0)

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
            <Trophy className="h-8 w-8 text-yellow-600" />
            Gestión de Torneos
          </h2>
          <p className="text-gray-600">Administra los torneos deportivos del club</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Torneos Activos</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{torneosActivos}</div>
              <p className="text-xs text-muted-foreground">En curso actualmente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participantes Totales</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{participantesTotales}</div>
              <p className="text-xs text-muted-foreground">En todos los torneos activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximos Torneos</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{proximosTorneos}</div>
              <p className="text-xs text-muted-foreground">Planificado para iniciar pronto</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Torneos</CardTitle>
              <Trophy className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-700">{totalTorneos}</div>
              <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-12 flex items-center gap-2 bg-transparent">
                <Plus className="h-5 w-5" />
                Nuevo Torneo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Torneo</DialogTitle>
                <DialogDescription>Completa la información para crear un nuevo torneo</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre del Torneo</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Copa de Verano 2024"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="disciplina">Disciplina</Label>
                    <Select
                      value={formData.disciplina}
                      onValueChange={(value) => setFormData({ ...formData, disciplina: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una disciplina" />
                      </SelectTrigger>
                      <SelectContent>
                        {deportes.map((deporte) => (
                          <SelectItem key={deporte.IdDeporte} value={deporte.Nombre}>
                            {deporte.Nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                    <Input
                      id="fechaInicio"
                      type="date"
                      value={formData.fechaInicio}
                      onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fechaFin">Fecha de Fin (Opcional)</Label>
                    <Input
                      id="fechaFin"
                      type="date"
                      value={formData.fechaFin}
                      onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="maxParticipantes">Máximo Participantes</Label>
                    <Input
                      id="maxParticipantes"
                      type="number"
                      value={formData.maxParticipantes}
                      onChange={(e) => setFormData({ ...formData, maxParticipantes: e.target.value })}
                      placeholder="Ej: 16"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="premioGanador">Premio Ganador</Label>
                    <Input
                      id="premioGanador"
                      value={formData.premioGanador}
                      onChange={(e) => setFormData({ ...formData, premioGanador: e.target.value })}
                      placeholder="Ej: $10,000"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción del torneo..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTorneo} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creando...
                    </>
                  ) : (
                    "Crear Torneo"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleGenerarFixture}
            className="bg-yellow-600 hover:bg-yellow-700 h-12 flex items-center gap-2"
          >
            <Calendar className="h-5 w-5" />
            Generar Fixture
          </Button>

          <Button
            onClick={handleRegistrarResultados}
            variant="outline"
            className="h-12 flex items-center gap-2 bg-transparent"
          >
            <FileText className="h-5 w-5" />
            Registrar Resultados
          </Button>
        </div>

        {/* Tabla de Torneos */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Torneos</CardTitle>
                <CardDescription>Lista de todos los torneos del club</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar torneo..."
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
                <span className="ml-3 text-gray-600">Cargando torneos...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Error al cargar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : filteredTorneos.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No se encontraron torneos.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead className="text-center">Participantes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTorneos.map((torneo) => (
                    <TableRow key={torneo.IdTorneo}>
                      <TableCell className="font-medium">{torneo.Nombre}</TableCell>
                      <TableCell>{torneo.Disciplina}</TableCell>
                      <TableCell>{format(new Date(torneo.FechaInicio), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-center">{torneo.Participantes}</TableCell>
                      <TableCell>{getEstadoBadge(torneo.Estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/torneos/editar/${torneo.IdTorneo}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
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
