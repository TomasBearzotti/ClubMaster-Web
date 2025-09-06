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
} from "recharts";

interface PartidoDetalle {
  IdPartido: number;
  IdTorneo: number;
  TorneoNombre: string;
  Disciplina: string;
  FechaHora?: string;
  ParticipanteA: string;
  ParticipanteB: string;
  Fase: string;
  Lugar: string;
  EstadoPartido: string;
  ArbitroId?: number;
  ArbitroNombre?: string;
  ResultadoEquipoA?: number;
  ResultadoEquipoB?: number;
  Observaciones?: string;
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

          // Actualizar en el estado local
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
        body: JSON.stringify({
          deporteId: partido.IdTorneo, // o el IdDeporte correspondiente
          partidoId: partido.IdPartido,
        }),
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

  const handleVolver = () => {
    router.back();
  };

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
            {partido.TorneoNombre} - {partido.Disciplina}
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
                  {partido.ParticipanteA} vs {partido.ParticipanteB}
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
                {estadisticas.length > 0 ? (
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {estadisticas.find(
                        (s) =>
                          s.ParticipanteNombre === partido.ParticipanteA &&
                          s.NombreCampo.includes("Sets Ganados")
                      )?.Valor || 0}
                      {" - "}
                      {estadisticas.find(
                        (s) =>
                          s.ParticipanteNombre === partido.ParticipanteB &&
                          s.NombreCampo.includes("Sets Ganados")
                      )?.Valor || 0}
                    </div>
                    <p className="text-gray-600">Resultado Final</p>
                  </div>
                ) : partido.ResultadoEquipoA !== undefined &&
                  partido.ResultadoEquipoB !== undefined ? (
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {partido.ResultadoEquipoA} - {partido.ResultadoEquipoB}
                    </div>
                    <p className="text-gray-600">Resultado Final</p>
                  </div>
                ) : null}

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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participante</TableHead>
                        <TableHead>Campo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Fecha Registro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estadisticas.map((stat) => (
                        <TableRow key={stat.IdEstadistica}>
                          <TableCell className="font-medium">
                            {stat.ParticipanteNombre}
                          </TableCell>
                          <TableCell>{stat.NombreCampo}</TableCell>
                          <TableCell className="font-semibold">
                            {stat.Valor}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(stat.FechaRegistro),
                              "dd/MM/yyyy HH:mm"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gráficos */}
          <TabsContent value="graficos">
            <div className="space-y-6">
              {estadisticas.length === 0 ? (
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
                  {/* Gráfico de Barras Comparativo */}
                  {chartData.length > 0 && numericFields.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Comparación de Estadísticas - {partido.Disciplina}
                        </CardTitle>
                        <CardDescription>
                          Comparación entre participantes
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="participante" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {numericFields.slice(0, 6).map((campo, index) => (
                              <Bar
                                key={campo}
                                dataKey={campo}
                                fill={COLORS[index % COLORS.length]}
                                name={campo}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Gráficos Circulares por Campo */}
                  {numericFields.slice(0, 4).map((campo) => {
                    const pieData = preparePieData(campo);
                    if (pieData.length === 0) return null;

                    return (
                      <Card key={campo}>
                        <CardHeader>
                          <CardTitle>Distribución - {campo}</CardTitle>
                          <CardDescription>
                            Distribución por participante
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsPieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Gráfico de líneas para deportes como Tenis/Pádel */}
                  {(partido.Disciplina?.toLowerCase().includes("tenis") ||
                    partido.Disciplina?.toLowerCase().includes("padel")) &&
                    numericFields.includes("Sets") && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Evolución por Sets</CardTitle>
                          <CardDescription>
                            Progresión del partido por sets
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="participante" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="Sets"
                                stroke="#8884d8"
                                strokeWidth={2}
                                name="Sets Ganados"
                              />
                              {numericFields.includes("Games") && (
                                <Line
                                  type="monotone"
                                  dataKey="Games"
                                  stroke="#82ca9d"
                                  strokeWidth={2}
                                  name="Games Ganados"
                                />
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
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
