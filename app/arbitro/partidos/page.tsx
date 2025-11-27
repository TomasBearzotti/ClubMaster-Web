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
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Partido {
  IdPartido: number;
  TorneoId: number;
  TorneoNombre: string;
  ParticipanteAId: number;
  ParticipanteBId: number;
  ParticipanteA: string;
  ParticipanteB: string;
  FechaHora?: string;
  FixtureNombre: string;
  Lugar: string;
  Estado: number;
  TieneEstadisticas: boolean;
  ArbitroId?: number;
  // Campos de resultado
  GanadorId?: number;
  EsEmpate?: boolean;
  TieneResultado?: boolean;
}

export default function ArbitroPartidosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [selectedPartidoId, setSelectedPartidoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [idArbitro, setIdArbitro] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  useEffect(() => {
    fetchArbitroData();
  }, []);

  useEffect(() => {
    if (idArbitro) {
      fetchPartidos();
    }
  }, [idArbitro]);

  const fetchArbitroData = async () => {
    try {
      // Obtener usuario logueado
      const meRes = await fetch("/api/seguridad/roles/logged", {
        cache: "no-store",
        credentials: "include",
      });
      if (!meRes.ok) {
        router.push("/");
        return;
      }
      const me = await meRes.json();

      // Obtener lista de usuarios para obtener idPersona
      const usersRes = await fetch("/api/seguridad/usuarios", { cache: "no-store" });
      if (!usersRes.ok) {
        router.push("/");
        return;
      }
      const users = await usersRes.json();
      const yo = users.find((u: any) => u.id === me.idUsuario);
      
      if (!yo?.idPersona) {
        toast({
          title: "Error",
          description: "Usuario sin persona asignada.",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      // Obtener lista de árbitros y buscar el del usuario actual
      const arbitrosResponse = await fetch("/api/arbitros", { cache: "no-store" });
      if (arbitrosResponse.ok) {
        const arbitros = await arbitrosResponse.json();
        const arbitro = arbitros.find(
          (a: any) => a.IdPersona === yo.idPersona
        );
        
        if (arbitro) {
          setIdArbitro(arbitro.IdArbitro);
        } else {
          toast({
            title: "Error",
            description: "No se encontró el perfil de árbitro.",
            variant: "destructive",
          });
          router.push("/arbitro-dashboard");
        }
      }
    } catch (error) {
      console.error("Error fetching arbitro data:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar los datos.",
        variant: "destructive",
      });
      router.push("/");
    }
  };

  const fetchPartidos = async () => {
    if (!idArbitro) return;

    setLoading(true);
    try {
      // Obtener todos los partidos
      const response = await fetch("/api/partidos?includeStats=true");
      if (response.ok) {
        const data = await response.json();
        
        // Filtrar solo los partidos donde soy el árbitro
        const misPartidos = data.filter(
          (p: Partido) => p.ArbitroId === idArbitro
        );

        // Ordenar por FechaHora
        const partidosOrdenados = misPartidos.sort((a: Partido, b: Partido) => {
          if (!a.FechaHora) return 1;
          if (!b.FechaHora) return -1;
          return a.FechaHora.localeCompare(b.FechaHora);
        });

        setPartidos(partidosOrdenados);
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
        description: "Ocurrió un error al cargar los partidos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlantilla = async (idPartido: number) => {
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
        if (match && match[1]) filename = match[1].replace(/_+$/, "");
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error fetching plantilla:", error);
    }
  };

  const handleOpenUploadDialog = (partido: Partido) => {
    if (!partido?.IdPartido) {
      console.error("IdPartido inválido:", partido);
      return;
    }

    setSelectedPartidoId(partido.IdPartido);
    setShowUploadDialog(true);
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
    if (!selectedFile || !selectedPartidoId) return;

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
        fetchPartidos(); // Refrescar partidos
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

  const partidosFiltrados = partidos.filter((partido) => {
    if (filtroEstado === "todos") return true;
    return partido.Estado === Number.parseInt(filtroEstado);
  });

  const handleVolver = () => {
    router.push("/arbitro-dashboard");
  };

  const partidoSeleccionado = partidos.find(p => p.IdPartido === selectedPartidoId);

  // Estadísticas
  const totalPartidos = partidos.length;
  const partidosProgramados = partidos.filter((p) => p.Estado === 0).length;
  const partidosEnCurso = partidos.filter((p) => p.Estado === 1).length;
  const partidosFinalizados = partidos.filter((p) => p.Estado === 2).length;
  const conEstadisticas = partidos.filter((p) => p.TieneEstadisticas).length;

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
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-purple-600" />
            Mis Partidos
          </h2>
          <p className="text-gray-600">
            Gestiona y carga los resultados de los partidos que arbitras
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Partidos</CardTitle>
              <Trophy className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalPartidos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Programados</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{partidosProgramados}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Curso</CardTitle>
              <Loader2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{partidosEnCurso}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
              <Trophy className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{partidosFinalizados}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Estadísticas</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{conEstadisticas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtrar Partidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Estado del Partido</Label>
              <select
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="0">Programados</option>
                <option value="1">En Curso</option>
                <option value="2">Finalizados</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Partidos */}
        <Card>
          <CardHeader>
            <CardTitle>Partidos Asignados</CardTitle>
            <CardDescription>
              {partidosFiltrados.length === 0
                ? "No tienes partidos asignados"
                : `${partidosFiltrados.length} partido(s) ${
                    filtroEstado !== "todos" ? "en el estado seleccionado" : "totales"
                  }`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Cargando partidos...</span>
              </div>
            ) : partidos.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  No tienes partidos asignados actualmente
                </p>
                <p className="text-sm text-gray-400">
                  Los administradores te asignarán partidos próximamente
                </p>
              </div>
            ) : partidosFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  No hay partidos con el filtro seleccionado
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Torneo</TableHead>
                    <TableHead>Participantes</TableHead>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Lugar</TableHead>
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
                      <TableCell className="font-medium">
                        {partido.TorneoNombre}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Participante A */}
                          <span
                            className={`transition-colors ${
                              partido.TieneResultado && !partido.EsEmpate
                                ? partido.GanadorId === partido.ParticipanteAId
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
                            partido.GanadorId === partido.ParticipanteAId && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}

                          <span className="text-gray-500">vs</span>

                          {/* Icono ganador B */}
                          {partido.TieneResultado &&
                            !partido.EsEmpate &&
                            partido.GanadorId === partido.ParticipanteBId && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}

                          {/* Participante B */}
                          <span
                            className={`transition-colors ${
                              partido.TieneResultado && !partido.EsEmpate
                                ? partido.GanadorId === partido.ParticipanteBId
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
                              {format(new Date(partido.FechaHora), "dd/MM/yyyy", { locale: es })}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(partido.FechaHora), "HH:mm", { locale: es })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Próximamente</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{partido.Lugar}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{partido.FixtureNombre}</Badge>
                      </TableCell>
                      <TableCell>{getEstadoPartidoBadge(partido.Estado)}</TableCell>
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
                          {partido.TieneEstadisticas ? "Actualizar" : "Cargar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog para cargar archivo */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Cargar Estadísticas del Partido</DialogTitle>
              <DialogDescription>
                {partidoSeleccionado && (
                  <>
                    <div className="font-medium">{partidoSeleccionado.TorneoNombre}</div>
                    {partidoSeleccionado.ParticipanteA} vs {partidoSeleccionado.ParticipanteB}
                    <br />
                    {partidoSeleccionado.FechaHora &&
                      format(
                        new Date(partidoSeleccionado.FechaHora),
                        "dd/MM/yyyy 'a las' HH:mm",
                        { locale: es }
                      )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
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
                      <li>Descarga la plantilla Excel específica para este deporte</li>
                      <li>Completa los datos de cada participante en las columnas correspondientes</li>
                      <li>Los campos marcados con * son obligatorios</li>
                      <li>Sube el archivo completado para procesar las estadísticas</li>
                      <li>El partido se marcará automáticamente como finalizado</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setSelectedFile(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUploadFile}
                disabled={!selectedFile || uploading}
                className="bg-purple-600 hover:bg-purple-700"
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
