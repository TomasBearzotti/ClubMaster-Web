"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  Trophy,
  Calendar,
  Users,
  Search,
  CheckCircle,
  Loader2,
  CalendarDays,
  UserCheck,
  Info,
  AlertTriangle,
  Edit,
  Clock,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Torneo {
  IdTorneo: number;
  Nombre: string;
  IdDeporte: number;
  NombreDeporte: string;
  FechaInicio: string;
  FechaFin?: string;
  Estado: number;
  Participantes: number;
}

interface TipoTorneo {
  id: string;
  nombre: string;
  descripcion: string;
  requierePotenciaDe2: boolean;
  minParticipantes: number;
  validacion: string;
}

interface Validacion {
  esValido: boolean;
  mensaje: string;
  numParticipantes: number;
  partidosEstimados: number;
}

interface Partido {
  IdPartido: number;
  FechaHora?: string;
  ParticipanteA: string;
  ParticipanteB: string;
  Fase: string;
  Grupo?: string;
  Lugar: string;
  Estado: number;
  ArbitroNombre?: string;
  TorneoNombre: string;
  FechaInicio: string;
  FechaFin?: string;
}

interface EditarPartidoData {
  fechaHora?: string;
  lugar?: string;
  arbitroId?: number | null;
}

export default function GenerarFixturePage() {
  const router = useRouter();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [tiposTorneo, setTiposTorneo] = useState<TipoTorneo[]>([]);
  const [loadingTorneos, setLoadingTorneos] = useState(true);
  const [errorTorneos, setErrorTorneos] = useState<string | null>(null);

  const [selectedTorneo, setSelectedTorneo] = useState<Torneo | null>(null);
  const [tipoFixture, setTipoFixture] = useState("eliminacion");
  const [validacion, setValidacion] = useState<Validacion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fixtureGenerado, setFixtureGenerado] = useState(false);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [activeTab, setActiveTab] = useState("calendario");

  // Estados para edición de partidos
  const [editingPartido, setEditingPartido] = useState<Partido | null>(null);
  const [editData, setEditData] = useState<EditarPartidoData>({
    arbitroId: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [arbitros, setArbitros] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingTorneos(true);
      setErrorTorneos(null);
      try {
        // Cargar torneos
        const torneosResponse = await fetch("/api/torneos");
        if (!torneosResponse.ok) {
          throw new Error(`HTTP error! status: ${torneosResponse.status}`);
        }
        const torneosData = await torneosResponse.json();
        setTorneos(torneosData);

        // Cargar tipos de torneo
        const tiposResponse = await fetch("/api/tipos-torneo");
        if (!tiposResponse.ok) {
          throw new Error(`HTTP error! status: ${tiposResponse.status}`);
        }
        const tiposData = await tiposResponse.json();
        setTiposTorneo(tiposData);

        // Cargar árbitros
        const arbitrosResponse = await fetch("/api/arbitros");
        if (arbitrosResponse.ok) {
          const arbitrosData = await arbitrosResponse.json();
          setArbitros(arbitrosData);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setErrorTorneos(`Error al cargar datos: ${error.message}`);
      } finally {
        setLoadingTorneos(false);
      }
    };
    fetchData();
  }, []);

  // Validar cuando cambie el torneo o tipo de fixture
  useEffect(() => {
    if (selectedTorneo && tipoFixture) {
      validarTorneo();
    }
  }, [selectedTorneo, tipoFixture]);

  const validarTorneo = async () => {
    if (!selectedTorneo) return;

    try {
      const response = await fetch("/api/torneos/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          torneoId: selectedTorneo.IdTorneo,
          tipoFixture,
        }),
      });

      if (response.ok) {
        const validacionData = await response.json();
        setValidacion(validacionData);
      }
    } catch (error) {
      console.error("Error validating torneo:", error);
    }
  };

  const handleSelectTorneo = (torneoId: string) => {
    const torneo = torneos.find((t) => t.IdTorneo.toString() === torneoId);
    setSelectedTorneo(torneo || null);
    setFixtureGenerado(false);
    setPartidos([]);
    setValidacion(null);

    // Cargar partidos existentes si los hay
    if (torneo) {
      cargarPartidos(torneo.IdTorneo);
    }
  };

  const handleGenerarFixture = async () => {
    if (!selectedTorneo || !validacion?.esValido) return;

    setIsGenerating(true);

    try {
      const response = await fetch("/api/fixture/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          torneoId: selectedTorneo.IdTorneo,
          tipoFixture,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await cargarPartidos(selectedTorneo.IdTorneo);
        setFixtureGenerado(true);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error generating fixture:", error);
      alert("Error al generar fixture");
    } finally {
      setIsGenerating(false);
    }
  };

  const cargarPartidos = async (torneoId?: number) => {
    const id = torneoId || selectedTorneo?.IdTorneo;
    if (!id) return;

    try {
      const response = await fetch(`/api/partidos?torneoId=${id}`);
      if (response.ok) {
        const partidosData = await response.json();
        setPartidos(partidosData);
        if (partidosData.length > 0) {
          setFixtureGenerado(true);
        }
      }
    } catch (error) {
      console.error("Error loading partidos:", error);
    }
  };

  const handleEditarPartido = (partido: Partido) => {
    setEditingPartido(partido);
    setEditData({
      fechaHora: partido.FechaHora || "",
      lugar: partido.Lugar || "",
      arbitroId: partido.ArbitroNombre ? partido.IdPartido : null,
    });
  };

  const handleSavePartido = async () => {
    if (!editingPartido) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/partidos/${editingPartido.IdPartido}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        }
      );

      if (response.ok) {
        await cargarPartidos();
        setEditingPartido(null);
        setEditData({ arbitroId: null });
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving partido:", error);
      alert("Error al guardar partido");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVolver = () => {
    router.push("/torneos");
  };

  const getTipoFixtureLabel = () => {
    const tipo = tiposTorneo.find((t) => t.id === tipoFixture);
    return tipo?.nombre || "";
  };

  const agruparPartidosPorFecha = () => {
    const partidosAgrupados: { [key: string]: Partido[] } = {};
    const partidosSinFecha: Partido[] = [];

    partidos.forEach((partido) => {
      if (partido.FechaHora) {
        const fecha = partido.FechaHora.split("T")[0];
        if (!partidosAgrupados[fecha]) {
          partidosAgrupados[fecha] = [];
        }
        partidosAgrupados[fecha].push(partido);
      } else {
        partidosSinFecha.push(partido);
      }
    });

    return { partidosAgrupados, partidosSinFecha };
  };

  const { partidosAgrupados, partidosSinFecha } = agruparPartidosPorFecha();

  const getEstadoTorneoBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Pendiente
          </Badge>
        );
      case 1:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Activo
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Finalizado
          </Badge>
        );
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
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
      case 3:
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const getValidacionIcon = () => {
    if (!validacion) return null;

    if (validacion.esValido) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
  };

  const getValidacionColor = () => {
    if (!validacion) return "border-gray-200 bg-gray-50";

    if (validacion.esValido) {
      return "border-green-200 bg-green-50";
    } else {
      return "border-red-200 bg-red-50";
    }
  };

  const formatFechaLimites = (torneo: Torneo) => {
    const inicio = format(new Date(torneo.FechaInicio), "dd/MM/yyyy");
    const fin = torneo.FechaFin
      ? format(new Date(torneo.FechaFin), "dd/MM/yyyy")
      : "Sin límite";
    return `${inicio} - ${fin}`;
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
            <Trophy className="h-8 w-8 text-yellow-600" />
            Generar Fixture de Torneo
          </h2>
          <p className="text-gray-600">
            Crea automáticamente el calendario de partidos para un torneo
          </p>
        </div>

        {/* Selección de Torneo */}
        {!fixtureGenerado && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Seleccionar Torneo
              </CardTitle>
              <CardDescription>
                Busca y selecciona el torneo para el cual deseas generar el
                fixture
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTorneos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">
                    Cargando torneos...
                  </span>
                </div>
              ) : errorTorneos ? (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Error al cargar</AlertTitle>
                  <AlertDescription>{errorTorneos}</AlertDescription>
                </Alert>
              ) : torneos.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  No hay torneos disponibles.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Label htmlFor="select-torneo">Seleccionar Torneo</Label>
                    <Select
                      onValueChange={handleSelectTorneo}
                      value={selectedTorneo?.IdTorneo.toString() || "0"}
                    >
                      <SelectTrigger id="select-torneo" className="mt-1">
                        <SelectValue placeholder="Buscar y seleccionar torneo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {torneos.map((torneo) => (
                          <SelectItem
                            key={torneo.IdTorneo}
                            value={torneo.IdTorneo.toString()}
                          >
                            {torneo.Nombre} - {torneo.NombreDeporte} (
                            {torneo.Participantes} participantes)
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
                          <h3 className="font-semibold text-yellow-900">
                            {selectedTorneo.Nombre}
                          </h3>
                          <p className="text-yellow-800">
                            Deporte: {selectedTorneo.NombreDeporte}
                          </p>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-4 w-4 text-yellow-700" />
                              <span>
                                Fechas: {formatFechaLimites(selectedTorneo)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-4 w-4 text-yellow-700" />
                              <span>
                                Participantes: {selectedTorneo.Participantes}
                              </span>
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
              <CardDescription>
                Selecciona el tipo de fixture que deseas generar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Tipo de Fixture</Label>
                <RadioGroup
                  value={tipoFixture}
                  onValueChange={setTipoFixture}
                  className="space-y-3"
                >
                  {tiposTorneo.map((tipo) => (
                    <div
                      key={tipo.id}
                      className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <RadioGroupItem value={tipo.id} id={tipo.id} />
                      <Label
                        htmlFor={tipo.id}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{tipo.nombre}</div>
                        <div className="text-sm text-gray-600">
                          {tipo.descripcion}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {tipo.validacion}
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Validación en tiempo real */}
              {validacion && (
                <div
                  className={`p-4 rounded-md border ${getValidacionColor()}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getValidacionIcon()}
                    <h4 className="font-medium">Validación del Fixture</h4>
                  </div>
                  <p className="text-sm mb-3">{validacion.mensaje}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Tipo de fixture</div>
                      <div className="font-medium">{getTipoFixtureLabel()}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Participantes</div>
                      <div className="font-medium">
                        {validacion.numParticipantes}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Partidos estimados</div>
                      <div className="font-medium">
                        {validacion.partidosEstimados}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button
                onClick={handleGenerarFixture}
                disabled={isGenerating || !validacion?.esValido}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 text-lg disabled:opacity-50"
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
        {fixtureGenerado && partidos.length > 0 && (
          <>
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Fixture generado para el torneo{" "}
                <span className="font-semibold">{selectedTorneo?.Nombre}</span>{" "}
                con {partidos.length} partidos. Los partidos se crearon sin
                fechas asignadas. Haz clic en "Editar" para asignar fechas y
                horarios.
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
                      {partidos.length} partidos generados con formato{" "}
                      {getTipoFixtureLabel()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger
                      value="sin-fecha"
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Sin Fecha ({partidosSinFecha.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="calendario"
                      className="flex items-center gap-2"
                    >
                      <CalendarDays className="h-4 w-4" />
                      Por Fecha ({Object.keys(partidosAgrupados).length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="fases"
                      className="flex items-center gap-2"
                    >
                      <Trophy className="h-4 w-4" />
                      Por Fase
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sin-fecha" className="mt-4">
                    {partidosSinFecha.length > 0 ? (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-orange-800">
                          <Clock className="h-5 w-5" />
                          Partidos sin fecha asignada
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Participante A</TableHead>
                              <TableHead>Participante B</TableHead>
                              <TableHead>Fase</TableHead>
                              <TableHead>Lugar</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {partidosSinFecha.map((partido) => (
                              <TableRow key={partido.IdPartido}>
                                <TableCell className="font-medium">
                                  {partido.ParticipanteA}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {partido.ParticipanteB}
                                </TableCell>
                                <TableCell>{partido.Fase}</TableCell>
                                <TableCell>{partido.Lugar}</TableCell>
                                <TableCell>
                                  {getEstadoPartidoBadge(partido.Estado)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditarPartido(partido)}
                                    className="text-xs"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Editar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Todos los partidos tienen fecha asignada</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="calendario" className="mt-4">
                    {Object.keys(partidosAgrupados).length > 0 ? (
                      Object.keys(partidosAgrupados)
                        .sort()
                        .map((fecha) => (
                          <div key={fecha} className="mb-6">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800">
                              <Calendar className="h-5 w-5" />
                              {format(new Date(fecha), "EEEE d 'de' MMMM", {
                                locale: es,
                              })}
                            </h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Hora</TableHead>
                                  <TableHead>Participante A</TableHead>
                                  <TableHead>Participante B</TableHead>
                                  <TableHead>Fase</TableHead>
                                  <TableHead>Lugar</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead>Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {partidosAgrupados[fecha]
                                  .sort((a, b) =>
                                    (a.FechaHora || "").localeCompare(
                                      b.FechaHora || ""
                                    )
                                  )
                                  .map((partido) => (
                                    <TableRow key={partido.IdPartido}>
                                      <TableCell>
                                        {partido.FechaHora
                                          ? format(
                                              new Date(partido.FechaHora),
                                              "HH:mm"
                                            )
                                          : "Sin hora"}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {partido.ParticipanteA}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {partido.ParticipanteB}
                                      </TableCell>
                                      <TableCell>{partido.Fase}</TableCell>
                                      <TableCell>{partido.Lugar}</TableCell>
                                      <TableCell>
                                        {getEstadoPartidoBadge(partido.Estado)}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleEditarPartido(partido)
                                          }
                                          className="text-xs"
                                        >
                                          <Edit className="h-3 w-3 mr-1" />
                                          Editar
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No hay partidos con fecha asignada</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="fases" className="mt-4">
                    {Array.from(new Set(partidos.map((p) => p.Fase))).map(
                      (fase) => (
                        <div key={fase} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800">
                            <Trophy className="h-5 w-5" />
                            {fase}
                          </h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Participante A</TableHead>
                                <TableHead>Participante B</TableHead>
                                <TableHead>Lugar</TableHead>
                                {partidos.some((p) => p.Grupo) && (
                                  <TableHead>Grupo</TableHead>
                                )}
                                <TableHead>Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {partidos
                                .filter((p) => p.Fase === fase)
                                .sort((a, b) =>
                                  (a.FechaHora || "").localeCompare(
                                    b.FechaHora || ""
                                  )
                                )
                                .map((partido) => (
                                  <TableRow key={partido.IdPartido}>
                                    <TableCell>
                                      {partido.FechaHora
                                        ? format(
                                            new Date(partido.FechaHora),
                                            "dd/MM/yyyy"
                                          )
                                        : "Sin fecha"}
                                    </TableCell>
                                    <TableCell>
                                      {partido.FechaHora
                                        ? format(
                                            new Date(partido.FechaHora),
                                            "HH:mm"
                                          )
                                        : "Sin hora"}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {partido.ParticipanteA}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {partido.ParticipanteB}
                                    </TableCell>
                                    <TableCell>{partido.Lugar}</TableCell>
                                    {partidos.some((p) => p.Grupo) && (
                                      <TableCell>
                                        {partido.Grupo && (
                                          <Badge variant="secondary">
                                            Grupo {partido.Grupo}
                                          </Badge>
                                        )}
                                      </TableCell>
                                    )}
                                    <TableCell>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleEditarPartido(partido)
                                        }
                                        className="text-xs"
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Editar
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      )
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleVolver}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Volver al Menú de Torneos
              </Button>
              <Button
                onClick={() => router.push("/arbitros")}
                variant="outline"
                className="border-purple-200 bg-transparent"
              >
                <UserCheck className="mr-2 h-5 w-5 text-purple-600" />
                Ir a Gestión de Árbitros
              </Button>
            </div>
          </>
        )}

        {/* Dialog para editar partido */}
        <Dialog
          open={!!editingPartido}
          onOpenChange={() => setEditingPartido(null)}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Partido
              </DialogTitle>
              <DialogDescription>
                {editingPartido && (
                  <>
                    {editingPartido.ParticipanteA} vs{" "}
                    {editingPartido.ParticipanteB}
                    <br />
                    <span className="text-xs text-gray-500">
                      Fechas permitidas:{" "}
                      {editingPartido.FechaInicio &&
                        formatFechaLimites({
                          FechaInicio: editingPartido.FechaInicio,
                          FechaFin: editingPartido.FechaFin,
                        } as Torneo)}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fecha-hora">Fecha y Hora</Label>
                <Input
                  id="fecha-hora"
                  type="datetime-local"
                  value={editData.fechaHora || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, fechaHora: e.target.value })
                  }
                  min={
                    editingPartido?.FechaInicio
                      ? editingPartido.FechaInicio.split("T")[0] + "T00:00"
                      : undefined
                  }
                  max={
                    editingPartido?.FechaFin
                      ? editingPartido.FechaFin.split("T")[0] + "T23:59"
                      : undefined
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lugar">Lugar</Label>
                <Input
                  id="lugar"
                  value={editData.lugar || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, lugar: e.target.value })
                  }
                  placeholder="Ej: Cancha Principal"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="arbitro">Árbitro</Label>
                <Select
                  value={editData.arbitroId?.toString() || "0"}
                  onValueChange={(value) =>
                    setEditData({
                      ...editData,
                      arbitroId: value ? Number.parseInt(value) : null,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar árbitro (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin árbitro</SelectItem>
                    {arbitros.map((arbitro) => (
                      <SelectItem
                        key={arbitro.IdArbitro}
                        value={arbitro.IdArbitro.toString()}
                      >
                        {arbitro.Nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPartido(null)}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSavePartido} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar
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
