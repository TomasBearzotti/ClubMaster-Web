"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Trophy,
  Loader2,
  Download,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Torneo {
  IdTorneo: number;
  Nombre: string;
  IdDeporte: number;
  NombreDeporte: string;
  FechaInicio: string;
  Estado: number;
  Participantes: number;
  Descripcion?: string;
  MaxParticipantes?: number;
  FechaFin?: string;
  PremioGanador?: string;
}

interface Partido {
  IdPartido: number;
  TorneoId: number;
  TorneoNombre: string;
  ParticipanteAId: number;
  ParticipanteBId: number;
  ParticipanteA: string;
  ParticipanteB: string;
  FechaHora?: string;
  FixtureNombre: string; // Nombre del fixture (antes era Fase)
  Lugar: string;
  Estado: number;
  TieneEstadisticas: boolean;
  // Campos de resultado
  GanadorId?: number;
  EsEmpate?: boolean;
  TieneResultado?: boolean;
}

interface PlantillaEstadistica {
  NombreCampo: string;
  TipoDato: string;
  EsObligatorio: boolean;
  Orden: number;
}

export default function CargarResultadosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [selectedTorneo, setSelectedTorneo] = useState<string>("");
  const [selectedPartido, setSelectedPartido] = useState<Partido | null>(null);
  const [selectedPartidoId, setSelectedPartidoId] = useState<number | null>(
    null
  );
  const [plantilla, setPlantilla] = useState<PlantillaEstadistica[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPartidos, setLoadingPartidos] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [faseSeleccionada, setFaseSeleccionada] = useState<string>("");

  useEffect(() => {
    fetchTorneos();
  }, []);

  useEffect(() => {
    if (selectedTorneo) {
      fetchPartidos(selectedTorneo);
    } else {
      setPartidos([]);
    }
  }, [selectedTorneo]);

  const fetchTorneos = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/torneos");
      if (response.ok) {
        const data = await response.json();
        // Only show active tournaments
        const torneosActivos = data.filter((t: Torneo) => t.Estado === 1);
        setTorneos(torneosActivos);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los torneos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching torneos:", error);
      toast({
        title: "Error",
        description: "Ocurrio un error al cargar los torneos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPartidos = async (torneoId: string) => {
    setLoadingPartidos(true);
    try {
      const response = await fetch(
        `/api/partidos?torneoId=${torneoId}&includeStats=true`
      );
      if (response.ok) {
        const data = await response.json();
        // Ordenar por FechaHora
        const partidosOrdenados = data.sort((a: Partido, b: Partido) => {
          if (!a.FechaHora) return 1;
          if (!b.FechaHora) return -1;
          return a.FechaHora.localeCompare(b.FechaHora);
        });
        setPartidos(partidosOrdenados);

        // Auto-seleccionar la primera fase con partidos pendientes
        if (partidosOrdenados.length > 0) {
          const fases = Array.from(
            new Set(partidosOrdenados.map((p: Partido) => p.FixtureNombre))
          ).sort() as string[];
          const faseConPendientes = fases.find((fase) =>
            partidosOrdenados.some(
              (p: Partido) => p.FixtureNombre === fase && p.Estado !== 2
            )
          );
          setFaseSeleccionada(faseConPendientes || fases[0] || "");
        }
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los partidos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching partidos:", error);
      toast({
        title: "Error",
        description: "Ocurrio un error al cargar los partidos.",
        variant: "destructive",
      });
    } finally {
      setLoadingPartidos(false);
    }
  };

  const fetchPlantilla = async (idPartido: number) => {
    console.log("=== fetchPlantilla INICIO ===");
    console.log("IdPartido recibido:", idPartido);

    try {
      const response = await fetch(
        `/api/estadisticas/plantillas/download?IdPartido=${idPartido}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;

      // Tomar nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "plantilla.xlsx";

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match && match[1]) filename = match[1].replace(/_+$/, ""); // Quitamos guiones bajos finales
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      console.log("Descarga completada:", filename);
    } catch (error) {
      console.error("Error fetching plantilla:", error);
    }
  };

  const handleOpenUploadDialog = (partido: Partido) => {
    console.log("=== handleOpenUploadDialog ===");
    console.log("Partido recibido:", partido);

    if (!partido?.IdPartido) {
      console.error("IdPartido inválido:", partido);
      return;
    }

    setSelectedPartidoId(partido.IdPartido); // Guardamos solo el Id
    setShowUploadDialog(true); // Abrimos el diálogo
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast({
          title: "Error",
          description: "Solo se permiten archivos Excel (.xlsx, .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || !selectedPartidoId) return; // usamos solo selectedPartidoId

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        `/api/partidos/${selectedPartidoId}/resultado`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Estadísticas cargadas exitosamente.",
        });
        setShowUploadDialog(false);
        setSelectedFile(null);
        fetchPartidos(selectedTorneo); // Refrescar partidos
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al cargar las estadísticas.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar el archivo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedPartidoId) {
      console.error("No hay partido seleccionado para descargar");
      return;
    }

    await fetchPlantilla(selectedPartidoId);
  };

  const getEstadoPartidoBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Programado
          </Badge>
        );
      case 1:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            En Curso
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Finalizado
          </Badge>
        );
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const obtenerFasesUnicas = () => {
    const fases = Array.from(new Set(partidos.map((p) => p.FixtureNombre)));
    return fases.sort();
  };

  const partidosFiltrados = faseSeleccionada
    ? partidos.filter((p) => p.FixtureNombre === faseSeleccionada)
    : partidos;

  const handleVolver = () => {
    router.push("/torneos");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-700">ClubMaster</h1>
            </div>
            <Button
              variant="outline"
              onClick={handleVolver}
              className="flex items-center gap-2 bg-transparent"
            >
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
            <Upload className="h-8 w-8 text-green-600" />
            Cargar Resultados
          </h2>
          <p className="text-gray-600">
            Sube archivos Excel con las estadísticas de los partidos
          </p>
        </div>

        {/* Selector de Torneo */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Seleccionar Torneo</CardTitle>
            <CardDescription>
              Elige el torneo para ver los partidos disponibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="torneo">Torneo</Label>
                <Select
                  value={selectedTorneo}
                  onValueChange={setSelectedTorneo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un torneo activo" />
                  </SelectTrigger>
                  <SelectContent>
                    {torneos.map((torneo) => (
                      <SelectItem
                        key={torneo.IdTorneo}
                        value={torneo.IdTorneo.toString()}
                      >
                        {torneo.Nombre} - {torneo.NombreDeporte}
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
                  <AlertDescription>
                    No hay torneos activos disponibles para cargar resultados.
                  </AlertDescription>
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
                {partidos.length === 0
                  ? "No hay partidos registrados"
                  : `${partidosFiltrados.length} partido(s) ${
                      faseSeleccionada ? `en ${faseSeleccionada}` : "total"
                    }`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPartidos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">
                    Cargando partidos...
                  </span>
                </div>
              ) : partidos.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    No hay partidos registrados para este torneo
                  </p>
                  <p className="text-sm text-gray-400">
                    Los partidos se generan automáticamente al crear el fixture
                  </p>
                </div>
              ) : (
                <>
                  {obtenerFasesUnicas().length > 1 && (
                    <div className="mb-4 flex items-center gap-2">
                      <Label htmlFor="fase-selector">Filtrar por Fase:</Label>
                      <Select
                        value={faseSeleccionada}
                        onValueChange={setFaseSeleccionada}
                      >
                        <SelectTrigger id="fase-selector" className="w-64">
                          <SelectValue placeholder="Todas las fases" />
                        </SelectTrigger>
                        <SelectContent>
                          {obtenerFasesUnicas().map((fase) => (
                            <SelectItem key={fase} value={fase}>
                              {fase}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {faseSeleccionada && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFaseSeleccionada("")}
                        >
                          Ver Todas
                        </Button>
                      )}
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participantes</TableHead>
                        <TableHead>Fecha/Hora</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Estadísticas</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partidosFiltrados.map((partido) => (
                        <TableRow key={partido.IdPartido}>
                          <TableCell>
                            <div className="flex items-center gap-2 font-medium">
                              {/* Participante A */}
                              <span
                                className={`transition-colors ${
                                  partido.TieneResultado && !partido.EsEmpate
                                    ? partido.GanadorId ===
                                      partido.ParticipanteAId
                                      ? "text-green-600 font-bold"
                                      : "text-gray-400"
                                    : ""
                                }`}
                              >
                                {partido.ParticipanteA}
                              </span>

                              {/* Icono ganador A */}
                              {partido.TieneResultado &&
                                !partido.EsEmpate &&
                                partido.GanadorId ===
                                  partido.ParticipanteAId && (
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                )}

                              <span className="text-gray-500">vs</span>

                              {/* Icono ganador B */}
                              {partido.TieneResultado &&
                                !partido.EsEmpate &&
                                partido.GanadorId ===
                                  partido.ParticipanteBId && (
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                )}

                              {/* Participante B */}
                              <span
                                className={`transition-colors ${
                                  partido.TieneResultado && !partido.EsEmpate
                                    ? partido.GanadorId ===
                                      partido.ParticipanteBId
                                      ? "text-green-600 font-bold"
                                      : "text-gray-400"
                                    : ""
                                }`}
                              >
                                {partido.ParticipanteB}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {partido.FechaHora ? (
                              <div>
                                <div>
                                  {format(
                                    new Date(partido.FechaHora),
                                    "dd/MM/yyyy"
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {format(new Date(partido.FechaHora), "HH:mm")}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">
                                Próximamente
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {partido.FixtureNombre}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getEstadoPartidoBadge(partido.Estado)}
                          </TableCell>
                          <TableCell>
                            {partido.TieneResultado ? (
                              partido.EsEmpate ? (
                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                  Empate
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  Finalizado
                                </Badge>
                              )
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                Sin resultado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {partido.TieneEstadisticas ? (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                Cargadas
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                Pendientes
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenUploadDialog(partido)}
                              className="flex items-center gap-1"
                            >
                              <Upload className="h-4 w-4" />
                              {partido.TieneEstadisticas
                                ? "Actualizar"
                                : "Cargar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialog para cargar archivo */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Cargar Estadísticas del Partido</DialogTitle>
              <DialogDescription>
                {selectedPartido && (
                  <>
                    {selectedPartido.ParticipanteA} vs{" "}
                    {selectedPartido.ParticipanteB}
                    <br />
                    {selectedPartido.FechaHora &&
                      format(
                        new Date(selectedPartido.FechaHora),
                        "dd/MM/yyyy 'a las' HH:mm"
                      )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Información de la plantilla */}
              {plantilla.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        Campos requeridos en el Excel:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {plantilla.map((campo) => (
                          <div
                            key={campo.NombreCampo}
                            className="flex items-center gap-2"
                          >
                            <span
                              className={
                                campo.EsObligatorio
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }
                            >
                              {campo.NombreCampo}
                            </span>
                            {campo.EsObligatorio && (
                              <span className="text-red-500">*</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Botón para descargar plantilla */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Download className="h-4 w-4" />
                  Descargar Plantilla Excel
                </Button>
              </div>

              {/* Selector de archivo */}
              <div className="grid gap-2">
                <Label htmlFor="file">Archivo Excel</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600">
                    Archivo seleccionado: {selectedFile.name}
                  </p>
                )}
              </div>

              {/* Instrucciones */}
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Instrucciones:</p>
                    <ul className="text-sm space-y-1 ml-4 list-disc">
                      <li>
                        Descarga la plantilla Excel específica para este deporte
                      </li>
                      <li>
                        Completa los datos de cada participante en las columnas
                        correspondientes
                      </li>
                      <li>Los campos marcados con * son obligatorios</li>
                      <li>
                        Sube el archivo completado para procesar las
                        estadísticas
                      </li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUploadFile}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Cargar Estadísticas
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
