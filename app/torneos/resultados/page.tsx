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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, FileText, Trophy, Loader2, Edit } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Torneo {
  IdTorneo: number
  Nombre: string
  Disciplina: string
  Estado: number
}

interface Partido {
  IdPartido: number
  TorneoId: number
  Equipo1: string
  Equipo2: string
  FechaHora: string
  Estado: number // 0: Programado, 1: En Curso, 2: Finalizado
  ResultadoEquipo1: number | null
  ResultadoEquipo2: number | null
  Observaciones: string | null
}

export default function RegistrarResultadosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [torneos, setTorneos] = useState<Torneo[]>([])
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [selectedTorneo, setSelectedTorneo] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [loadingPartidos, setLoadingPartidos] = useState(false)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [selectedPartido, setSelectedPartido] = useState<Partido | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state for result
  const [resultForm, setResultForm] = useState({
    resultadoEquipo1: "",
    resultadoEquipo2: "",
    observaciones: "",
  })

  useEffect(() => {
    fetchTorneos()
  }, [])

  useEffect(() => {
    if (selectedTorneo) {
      fetchPartidos(selectedTorneo)
    } else {
      setPartidos([])
    }
  }, [selectedTorneo])

  const fetchTorneos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/torneos")
      if (response.ok) {
        const data = await response.json()
        // Only show active tournaments
        const torneosActivos = data.filter((t: Torneo) => t.Estado === 1)
        setTorneos(torneosActivos)
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

  const fetchPartidos = async (torneoId: string) => {
    setLoadingPartidos(true)
    try {
      const response = await fetch(`/api/partidos?torneoId=${torneoId}`)
      if (response.ok) {
        const data = await response.json()
        setPartidos(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los partidos.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching partidos:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los partidos.",
        variant: "destructive",
      })
    } finally {
      setLoadingPartidos(false)
    }
  }

  const handleOpenResultDialog = (partido: Partido) => {
    setSelectedPartido(partido)
    setResultForm({
      resultadoEquipo1: partido.ResultadoEquipo1?.toString() || "",
      resultadoEquipo2: partido.ResultadoEquipo2?.toString() || "",
      observaciones: partido.Observaciones || "",
    })
    setShowResultDialog(true)
  }

  const handleSaveResult = async () => {
    if (!selectedPartido) return

    if (!resultForm.resultadoEquipo1 || !resultForm.resultadoEquipo2) {
      toast({
        title: "Error",
        description: "Ambos resultados son requeridos.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/partidos/${selectedPartido.IdPartido}/resultado`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resultadoEquipo1: Number.parseInt(resultForm.resultadoEquipo1),
          resultadoEquipo2: Number.parseInt(resultForm.resultadoEquipo2),
          observaciones: resultForm.observaciones,
          estado: 2, // Finalizado
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Resultado registrado exitosamente.",
        })
        setShowResultDialog(false)
        fetchPartidos(selectedTorneo) // Refresh partidos
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al registrar el resultado.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error saving result:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al registrar el resultado.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getEstadoPartidoBadge = (estado: number) => {
    switch (estado) {
      case 0: // Programado
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Programado</Badge>
      case 1: // En Curso
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">En Curso</Badge>
      case 2: // Finalizado
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Finalizado</Badge>
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  const handleVolver = () => {
    router.push("/torneos")
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
            <FileText className="h-8 w-8 text-green-600" />
            Registrar Resultados
          </h2>
          <p className="text-gray-600">Registra los resultados de los partidos de los torneos</p>
        </div>

        {/* Selector de Torneo */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Seleccionar Torneo</CardTitle>
            <CardDescription>Elige el torneo para ver y registrar resultados de partidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="torneo">Torneo</Label>
                <Select value={selectedTorneo} onValueChange={setSelectedTorneo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un torneo activo" />
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
              {loading && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando torneos...
                </div>
              )}
              {!loading && torneos.length === 0 && (
                <Alert>
                  <AlertDescription>No hay torneos activos disponibles para registrar resultados.</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Partidos */}
        {selectedTorneo && (
          <Card>
            <CardHeader>
              <CardTitle>Partidos del Torneo</CardTitle>
              <CardDescription>
                {partidos.length === 0 ? "No hay partidos registrados" : `${partidos.length} partido(s) encontrado(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPartidos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">Cargando partidos...</span>
                </div>
              ) : partidos.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No hay partidos registrados para este torneo</p>
                  <p className="text-sm text-gray-400">Los partidos se generan automáticamente al crear el fixture</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipo 1</TableHead>
                      <TableHead>Equipo 2</TableHead>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partidos.map((partido) => (
                      <TableRow key={partido.IdPartido}>
                        <TableCell className="font-medium">{partido.Equipo1}</TableCell>
                        <TableCell className="font-medium">{partido.Equipo2}</TableCell>
                        <TableCell>{format(new Date(partido.FechaHora), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>{getEstadoPartidoBadge(partido.Estado)}</TableCell>
                        <TableCell>
                          {partido.Estado === 2 ? (
                            <span className="font-medium">
                              {partido.ResultadoEquipo1} - {partido.ResultadoEquipo2}
                            </span>
                          ) : (
                            <span className="text-gray-400">Sin resultado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenResultDialog(partido)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            {partido.Estado === 2 ? "Ver/Editar" : "Registrar"}
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

        {/* Dialog para registrar resultado */}
        <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedPartido?.Estado === 2 ? "Ver/Editar Resultado" : "Registrar Resultado"}
              </DialogTitle>
              <DialogDescription>
                {selectedPartido && (
                  <>
                    {selectedPartido.Equipo1} vs {selectedPartido.Equipo2}
                    <br />
                    {format(new Date(selectedPartido.FechaHora), "dd/MM/yyyy 'a las' HH:mm")}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="resultado1">{selectedPartido?.Equipo1}</Label>
                  <Input
                    id="resultado1"
                    type="number"
                    min="0"
                    value={resultForm.resultadoEquipo1}
                    onChange={(e) => setResultForm({ ...resultForm, resultadoEquipo1: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="resultado2">{selectedPartido?.Equipo2}</Label>
                  <Input
                    id="resultado2"
                    type="number"
                    min="0"
                    value={resultForm.resultadoEquipo2}
                    onChange={(e) => setResultForm({ ...resultForm, resultadoEquipo2: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="observaciones">Observaciones (Opcional)</Label>
                <Input
                  id="observaciones"
                  value={resultForm.observaciones}
                  onChange={(e) => setResultForm({ ...resultForm, observaciones: e.target.value })}
                  placeholder="Ej: Partido suspendido por lluvia, gol en tiempo extra, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResultDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveResult} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Resultado"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
