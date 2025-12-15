"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Clock,
  MapPin,
  User,
  Loader2,
  BarChart3,
  PieChart,
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import React from "react";

interface PartidoDetalle {
  IdPartido: number;
  IdTorneo: number;
  TorneoNombre: string;
  IdDeporte: number;
  NombreDeporte: string;
  FechaHora?: string;
  ParticipanteAId: number;
  ParticipanteBId: number;
  ParticipanteA: string;
  ParticipanteB: string;
  FixtureNombre: string; // Nombre del fixture (antes Fase)
  Lugar: string;
  EstadoPartido: string;
  ArbitroId?: number;
  ArbitroNombre?: string;
  ResultadoEquipoA?: number;
  ResultadoEquipoB?: number;
  Observaciones?: string;
  // Campos de resultado
  GanadorId?: number;
  EsEmpate?: boolean;
  NombreGanador?: string;
  TieneResultado?: boolean;
}

interface EstadisticaPartido {
  IdEstadistica: number;
  ParticipanteId: number;
  ParticipanteNombre: string;
  NombreCampo: string;
  Valor: string;
  FechaRegistro: string;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

export default function PartidoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const [partido, setPartido] = useState<PartidoDetalle | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticaPartido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const partidoId = params.id as string;

  useEffect(() => {
    fetchPartidoDetalle();
  }, [partidoId]);

  useEffect(() => {
    if (partido) {
      fetchEstadisticas();
      fetchPlantilla();
    }
  }, [partido]);

  const fetchPartidoDetalle = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/partidos/${partidoId}`);
      if (!response.ok) {
        throw new Error(`Error al cargar partido: ${response.status}`);
      }
      const data = await response.json();
      setPartido(data);
    } catch (error: any) {
      console.error("Error fetching partido:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEstadisticas = async () => {
    try {
      const response = await fetch(`/api/estadisticas/${partidoId}`);
      if (response.ok) {
        const data = await response.json();
        setEstadisticas(data);

        if (data.length > 0 && partido?.EstadoPartido !== "finalizado") {
          // Llamar a tu API de actualización
          await fetch(`/api/partidos/${partidoId}/estado`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "finalizado" }),
          });

          // ✅ Corregido: sin el "+"
          setPartido((prev) =>
            prev ? { ...prev, EstadoPartido: "finalizado" } : prev
          );
        }
      }
    } catch (error) {
      console.error("Error fetching estadisticas:", error);
    }
  };

  const fetchPlantilla = async () => {
    if (!partido) return;
    try {
      const response = await fetch("/api/estadisticas/plantillas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ IdDeporte: partido.IdDeporte }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Plantilla:", data);
      } else {
        console.error("Error al obtener plantilla:", response.status);
      }
    } catch (err) {
      console.error("Error fetching plantilla:", err);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "programado":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Programado
          </Badge>
        );
      case "en_curso":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            En Curso
          </Badge>
        );
      case "finalizado":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Finalizado
          </Badge>
        );
      case "cancelado":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Cancelado
          </Badge>
        );
      case "suspendido":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Suspendido
          </Badge>
        );
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const prepareBarChartData = () => {
    const data: Record<string, any>[] = [];
    const participantesStats: Record<string, Record<string, number>> = {};

    // Agrupar estadísticas por participante
    estadisticas.forEach((stat) => {
      if (!participantesStats[stat.ParticipanteNombre]) {
        participantesStats[stat.ParticipanteNombre] = {};
      }
      const valor = Number.parseFloat(stat.Valor) || 0;
      participantesStats[stat.ParticipanteNombre][stat.NombreCampo] = valor;
    });

    // Convertir a formato para gráficos
    Object.entries(participantesStats).forEach(([participante, stats]) => {
      data.push({
        participante,
        ...stats,
      });
    });

    return data;
  };

  const preparePieData = (campo: string) => {
    const data = estadisticas
      .filter((stat) => stat.NombreCampo === campo)
      .map((stat) => ({
        name: stat.ParticipanteNombre,
        value: Number.parseFloat(stat.Valor) || 0,
      }))
      .filter((item) => item.value > 0);

    return data;
  };

  const getRelevantFields = () => {
    const campos = [...new Set(estadisticas.map((stat) => stat.NombreCampo))];
    return campos.filter((campo) => {
      const valores = estadisticas
        .filter((stat) => stat.NombreCampo === campo)
        .map((stat) => Number.parseFloat(stat.Valor) || 0);
      return valores.some((valor) => valor > 0);
    });
  };

  const isNumericField = (campo: string) => {
    const valor = estadisticas.find(
      (stat) => stat.NombreCampo === campo
    )?.Valor;
    return !isNaN(Number.parseFloat(valor || ""));
  };

  // Determinar si el deporte debe mostrar Radar Chart
  const shouldShowRadarChart = () => {
    if (!partido) return false;
    // Radar Chart funciona bien para deportes con métricas similares
    // Tenis, Paddle y Básquet: SI
    // Fútbol: NO (goles vs tarjetas vs minutos no tiene sentido visual)
    return [2, 3, 4].includes(partido.IdDeporte); // Básquet, Tenis, Paddle
  };

  // Determinar si debe mostrar gráficos especiales
  const getDeporteSpecificCharts = () => {
    if (!partido) return [];
    const charts: string[] = [];
    
    switch (partido.IdDeporte) {
      case 1: // Fútbol
        // Para fútbol, separar goles/asistencias de tarjetas
        charts.push('tarjetas-timeline');
        break;
      case 2: // Básquet
        // Para básquet, mostrar eficiencia
        charts.push('eficiencia');
        break;
      case 3: // Tenis
      case 4: // Paddle
        // Para tenis/paddle, destacar estadísticas de servicio
        charts.push('servicio');
        break;
    }
    return charts;
  };

  // Filtrar estadísticas según el tipo de gráfico
  const getStatsForChart = (type: 'principal' | 'secundario') => {
    if (!partido) return estadisticasAgrupadas;
    
    if (partido.IdDeporte === 1) { // Fútbol
      if (type === 'principal') {
        // Solo goles, asistencias, minutos jugados
        return estadisticasAgrupadas.filter(s => 
          ['Goles', 'Asistencias', 'Minutos Jugados'].includes(s.nombre)
        );
      } else {
        // Tarjetas
        return estadisticasAgrupadas.filter(s => 
          s.nombre.toLowerCase().includes('tarjeta')
        );
      }
    }
    
    return estadisticasAgrupadas;
  };

  const handleVolver = () => {
    router.back();
  };

  const normalize = (s: string) => (s ?? "").toString().trim().toLowerCase();

  // Orden de preferencia de campos de resultado para distintos deportes
  const SCORE_FIELDS = ["sets ganados", "goles", "puntos", "score", "tantos"];

  const getScoreFromStats = (participantName: string) => {
    const target = normalize(participantName);

    // 1) Buscar por campos preferidos (uno por participante)
    for (const field of SCORE_FIELDS) {
      const row = estadisticas.find(
        (s) =>
          normalize(s.ParticipanteNombre) === target &&
          normalize(s.NombreCampo).includes(field)
      );
      if (row && !Number.isNaN(parseFloat(row.Valor))) {
        return parseFloat(row.Valor);
      }
    }

    // 2) Fallback ultra-cauto: si NO hay ningún campo preferido,
    // y sólo hay UN campo numérico para ese participante, usarlo.
    const numericRows = estadisticas.filter(
      (s) =>
        normalize(s.ParticipanteNombre) === target &&
        !Number.isNaN(parseFloat(s.Valor))
    );
    if (numericRows.length === 1) {
      return parseFloat(numericRows[0].Valor);
    }

    // Si no hay forma confiable, no mostrar marcador.
    return undefined;
  };

  // Agrupar estadísticas: un campo con valores de A y B
  const estadisticasAgrupadas = React.useMemo(() => {
    if (!partido?.ParticipanteA || !partido?.ParticipanteB) return [];

    const result: { nombre: string; valorA: any; valorB: any }[] = [];

    const camposUnicos = Array.from(
      new Set(estadisticas.map((s) => s.NombreCampo))
    );

    for (const campo of camposUnicos) {
      const valorA =
        estadisticas.find(
          (s) =>
            s.NombreCampo === campo &&
            s.ParticipanteNombre === partido.ParticipanteA
        )?.Valor || 0;

      const valorB =
        estadisticas.find(
          (s) =>
            s.NombreCampo === campo &&
            s.ParticipanteNombre === partido.ParticipanteB
        )?.Valor || 0;

      result.push({ nombre: campo, valorA, valorB });
    }

    return result;
  }, [estadisticas, partido]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-gray-600">Cargando partido...</span>
        </div>
      </div>
    );
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
              <Button
                variant="outline"
                onClick={handleVolver}
                className="flex items-center gap-2 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              {error || "Partido no encontrado"}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const chartData = prepareBarChartData();
  const relevantFields = getRelevantFields();
  const numericFields = relevantFields.filter(isNumericField);

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
              Volver
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            {partido.ParticipanteA} vs {partido.ParticipanteB}
          </h2>
          <p className="text-gray-600">
            {partido.TorneoNombre} - {partido.NombreDeporte}
          </p>
        </div>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          </TabsList>

          {/* Información del Partido */}
          <TabsContent value="info">
            <Card>
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <CardDescription>{partido.TorneoNombre}</CardDescription>
                </div>
                <CardTitle className="text-2xl">
                  <div className="flex items-center justify-center gap-4">
                    {/* Participante A */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`transition-all duration-300 ${
                          partido.TieneResultado && !partido.EsEmpate
                            ? partido.GanadorId === partido.ParticipanteAId
                              ? "text-green-600 font-extrabold animate-pulse"
                              : "text-gray-400"
                            : ""
                        }`}
                      >
                        {partido.ParticipanteA}
                      </span>
                      {partido.TieneResultado &&
                        !partido.EsEmpate &&
                        partido.GanadorId === partido.ParticipanteAId && (
                          <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
                        )}
                    </div>

                    <span className="text-gray-500">vs</span>

                    {/* Participante B */}
                    <div className="flex items-center gap-2">
                      {partido.TieneResultado &&
                        !partido.EsEmpate &&
                        partido.GanadorId === partido.ParticipanteBId && (
                          <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
                        )}
                      <span
                        className={`transition-all duration-300 ${
                          partido.TieneResultado && !partido.EsEmpate
                            ? partido.GanadorId === partido.ParticipanteBId
                              ? "text-green-600 font-extrabold animate-pulse"
                              : "text-gray-400"
                            : ""
                        }`}
                      >
                        {partido.ParticipanteB}
                      </span>
                    </div>
                  </div>
                </CardTitle>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Badge variant="outline" className="text-sm">
                    {partido.FixtureNombre}
                  </Badge>
                  {getEstadoBadge(partido.EstadoPartido)}
                  {/* Badge de Empate */}
                  {partido.EsEmpate && (
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                      Empate
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Resultado */}
                {estadisticas.length > 0 &&
                  partido &&
                  (() => {
                    // El primer campo de la plantilla corresponde al resultado (Sets Ganados, Goles, Puntos, etc.)
                    const primerCampo = estadisticas[0]?.NombreCampo;

                    // Buscar el valor del primer campo para cada participante por ID
                    const getResultado = (participanteId: number) => {
                      const row = estadisticas.find(
                        (s) =>
                          s.ParticipanteId === participanteId &&
                          s.NombreCampo === primerCampo
                      );
                      return row ? Number(row.Valor) : 0;
                    };

                    const a = getResultado(partido.ParticipanteAId);
                    const b = getResultado(partido.ParticipanteBId);

                    return (
                      <div className="text-center mb-6">
                        <div className="flex items-center justify-center gap-4">
                          <div
                            className={`text-4xl font-bold transition-all ${
                              partido.GanadorId === partido.ParticipanteAId
                                ? "text-green-600 scale-110"
                                : partido.EsEmpate
                                ? "text-yellow-600"
                                : "text-gray-400"
                            }`}
                          >
                            {a}
                          </div>
                          <span className="text-2xl text-gray-500">-</span>
                          <div
                            className={`text-4xl font-bold transition-all ${
                              partido.GanadorId === partido.ParticipanteBId
                                ? "text-green-600 scale-110"
                                : partido.EsEmpate
                                ? "text-yellow-600"
                                : "text-gray-400"
                            }`}
                          >
                            {b}
                          </div>
                        </div>
                        <p className="text-gray-600 mt-2">Resultado Final</p>
                        {partido.TieneResultado && (
                          <div className="mt-3">
                            {partido.EsEmpate ? (
                              <p className="text-yellow-600 font-semibold">
                                ¡Partido empatado!
                              </p>
                            ) : (
                              <p className="text-green-600 font-semibold">
                                Ganador: {partido.NombreGanador}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                {/* Información del Partido */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-700">Fecha</h3>
                    </div>
                    <p className="text-gray-600">
                      {partido.FechaHora
                        ? format(new Date(partido.FechaHora), "dd/MM/yyyy")
                        : "Próximamente"}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-gray-700">Hora</h3>
                    </div>
                    <p className="text-gray-600">
                      {partido.FechaHora
                        ? format(new Date(partido.FechaHora), "HH:mm")
                        : "Próximamente"}
                    </p>
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
                    <h3 className="font-semibold text-gray-700 mb-2">
                      Observaciones
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-600">{partido.Observaciones}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estadísticas */}
          <TabsContent value="estadisticas">
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas del Partido</CardTitle>
                <CardDescription>
                  {estadisticas.length === 0
                    ? "No hay estadísticas registradas"
                    : `${estadisticas.length} estadística(s) registrada(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {estadisticas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No hay estadísticas registradas para este partido</p>
                    <p className="text-sm mt-2">
                      Las estadísticas se cargan desde el panel de
                      administración
                    </p>
                  </div>
                ) : (
                  <div className="w-full max-w-2xl mx-auto">
                    {/* Encabezados de participantes */}
                    <div className="grid grid-cols-3 text-center mb-4 font-semibold text-gray-800">
                      <div>{partido.ParticipanteA}</div>
                      <div></div>
                      <div>{partido.ParticipanteB}</div>
                    </div>

                    {/* Stats lado a lado */}
                    <div className="grid grid-cols-3 gap-y-4 text-center">
                      {estadisticasAgrupadas.map((stat) => (
                        <React.Fragment key={stat.nombre}>
                          <div className="text-lg font-bold text-blue-600">
                            {stat.valorA}
                          </div>
                          <div className="text-sm text-gray-700">
                            {stat.nombre}
                          </div>
                          <div className="text-lg font-bold text-red-600">
                            {stat.valorB}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Gráficos */}
          <TabsContent value="graficos">
            <div className="space-y-6">
              {estadisticasAgrupadas.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No hay datos para mostrar
                    </h3>
                    <p className="text-gray-600">
                      Registra estadísticas para ver los gráficos comparativos
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Gráficos según tipo de deporte */}
                  {partido.IdDeporte === 1 && (
                    /* FÚTBOL: Separar goles/asistencias de tarjetas */
                    <>
                      {/* Goles y Asistencias */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Desempeño Ofensivo</CardTitle>
                          <CardDescription>
                            Goles y asistencias
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              layout="vertical"
                              data={getStatsForChart('principal')}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="nombre" />
                              <Tooltip />
                              <Legend />
                              <Bar
                                dataKey="valorA"
                                name={partido.ParticipanteA}
                                fill="#10b981"
                                barSize={20}
                              />
                              <Bar
                                dataKey="valorB"
                                name={partido.ParticipanteB}
                                fill="#f59e0b"
                                barSize={20}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Tarjetas */}
                      {getStatsForChart('secundario').length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Disciplina</CardTitle>
                            <CardDescription>
                              Tarjetas amarillas y rojas
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={getStatsForChart('secundario')}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="nombre" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar
                                  dataKey="valorA"
                                  name={partido.ParticipanteA}
                                  fill="#2563eb"
                                  stackId="a"
                                />
                                <Bar
                                  dataKey="valorB"
                                  name={partido.ParticipanteB}
                                  fill="#dc2626"
                                  stackId="a"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}

                  {partido.IdDeporte === 2 && (
                    /* BÁSQUET: Barras + Radar para rendimiento integral */
                    <>
                      {/* Comparación Principal */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Estadísticas del Partido</CardTitle>
                          <CardDescription>
                            {partido.ParticipanteA} vs {partido.ParticipanteB}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart
                              layout="vertical"
                              data={estadisticasAgrupadas}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="nombre" width={120} />
                              <Tooltip />
                              <Legend />
                              <Bar
                                dataKey="valorA"
                                name={partido.ParticipanteA}
                                fill="#2563eb"
                                barSize={18}
                              />
                              <Bar
                                dataKey="valorB"
                                name={partido.ParticipanteB}
                                fill="#dc2626"
                                barSize={18}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Radar Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Análisis Integral</CardTitle>
                          <CardDescription>
                            Rendimiento multidimensional
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={400}>
                            <RadarChart
                              outerRadius={120}
                              data={estadisticasAgrupadas}
                            >
                              <PolarGrid />
                              <PolarAngleAxis dataKey="nombre" />
                              <PolarRadiusAxis />
                              <Radar
                                name={partido.ParticipanteA}
                                dataKey="valorA"
                                stroke="#2563eb"
                                fill="#2563eb"
                                fillOpacity={0.6}
                              />
                              <Radar
                                name={partido.ParticipanteB}
                                dataKey="valorB"
                                stroke="#dc2626"
                                fill="#dc2626"
                                fillOpacity={0.6}
                              />
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {(partido.IdDeporte === 3 || partido.IdDeporte === 4) && (
                    /* TENIS/PADDLE: Enfoque en estadísticas de servicio y calidad */
                    <>
                      {/* Resultado por Sets/Games */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Resultados</CardTitle>
                          <CardDescription>
                            Sets y games ganados
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              layout="vertical"
                              data={estadisticasAgrupadas.filter(s => 
                                s.nombre.toLowerCase().includes('set') || 
                                s.nombre.toLowerCase().includes('game')
                              )}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="nombre" />
                              <Tooltip />
                              <Legend />
                              <Bar
                                dataKey="valorA"
                                name={partido.ParticipanteA}
                                fill="#10b981"
                                barSize={25}
                              />
                              <Bar
                                dataKey="valorB"
                                name={partido.ParticipanteB}
                                fill="#f59e0b"
                                barSize={25}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Calidad de Juego */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Calidad de Juego</CardTitle>
                          <CardDescription>
                            Aces, winners y errores
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={350}>
                            <RadarChart
                              outerRadius={120}
                              data={estadisticasAgrupadas.filter(s => 
                                !s.nombre.toLowerCase().includes('set') && 
                                !s.nombre.toLowerCase().includes('game')
                              )}
                            >
                              <PolarGrid />
                              <PolarAngleAxis dataKey="nombre" />
                              <PolarRadiusAxis />
                              <Radar
                                name={partido.ParticipanteA}
                                dataKey="valorA"
                                stroke="#10b981"
                                fill="#10b981"
                                fillOpacity={0.6}
                              />
                              <Radar
                                name={partido.ParticipanteB}
                                dataKey="valorB"
                                stroke="#f59e0b"
                                fill="#f59e0b"
                                fillOpacity={0.6}
                              />
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Comparación Completa */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Resumen Completo</CardTitle>
                          <CardDescription>
                            Todas las estadísticas
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart
                              layout="vertical"
                              data={estadisticasAgrupadas}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="nombre" width={100} />
                              <Tooltip />
                              <Legend />
                              <Bar
                                dataKey="valorA"
                                name={partido.ParticipanteA}
                                fill="#2563eb"
                                barSize={15}
                              />
                              <Bar
                                dataKey="valorB"
                                name={partido.ParticipanteB}
                                fill="#dc2626"
                                barSize={15}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Fallback para otros deportes */}
                  {![1, 2, 3, 4].includes(partido.IdDeporte) && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle>Comparación Directa</CardTitle>
                          <CardDescription>
                            {partido.ParticipanteA} vs {partido.ParticipanteB}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart
                              layout="vertical"
                              data={estadisticasAgrupadas}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="nombre" />
                              <Tooltip />
                              <Legend />
                              <Bar
                                dataKey="valorA"
                                name={partido.ParticipanteA}
                                fill="#2563eb"
                                barSize={15}
                              />
                              <Bar
                                dataKey="valorB"
                                name={partido.ParticipanteB}
                                fill="#dc2626"
                                barSize={15}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
