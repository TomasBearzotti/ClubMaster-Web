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
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Trophy,
  Plus,
  Search,
  Calendar,
  Users,
  Info,
  Loader2,
  Edit,
  Trash2,
  FileText,
  ChevronDown,
  ChevronRight,
  Eye,
  Clock,
  MoreVertical,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { BracketView } from "@/components/BracketView";

interface Torneo {
  IdTorneo: number;
  Nombre: string;
  IdDeporte: number;
  NombreDeporte: string;
  FechaInicio: string;
  Estado: number;
  Participantes: number;
  TipoTorneo?: number; // 0=Liga, 1=Eliminación, 2=Grupos+Eliminación, null=Sin fixture generado
  Descripcion?: string;
  MaxParticipantes?: number;
  FechaFin?: string;
  PremioGanador?: string;
}

interface TorneoDetalle {
  IdTorneo: number;
  Nombre: string;
  Descripcion: string;
  IdDeporte: number;
  NombreDeporte: string;
  FechaInicio: string;
  FechaFin: string;
  Estado: number;
  MaxParticipantes: number;
  PremioGanador: string;
  ParticipantesActuales: number;
}

type Participante = {
  id: number;
  nombre: string;
  tipo: string;
  esEquipo: number;
  socioId: number | null;
  equipoId: number | null;
};

interface Partido {
  IdPartido: number;
  IdTorneo: number;
  FechaHora?: string;
  ParticipanteA: string | null; // Puede ser null para partidos TBD
  ParticipanteB: string | null; // Puede ser null para partidos TBD
  FixtureNombre: string; // Nombre del fixture (antes era Fase)
  NumeroRonda?: number; // Número de ronda del fixture
  Grupo?: string;
  Lugar: string;
  Estado: number;
  ArbitroNombre?: string;
  TorneoNombre: string;
  FechaInicio: string;
  FechaFin?: string;
}

interface Deporte {
  IdDeporte: number;
  Nombre: string;
}

export default function GestionTorneosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [torneosExpandidos, setTorneosExpandidos] = useState<Set<number>>(
    new Set()
  );
  const [torneosDetalle, setTorneosDetalle] = useState<
    Record<number, TorneoDetalle>
  >({});
  const [participantesPorTorneo, setParticipantesPorTorneo] = useState<
    Record<number, Participante[]>
  >({});
  const [partidosPorTorneo, setPartidosPorTorneo] = useState<
    Record<number, Partido[]>
  >({});
  const [equiposExpandidos, setEquiposExpandidos] = useState<Set<string>>(
    new Set()
  );
  const [integrantesEquipos, setIntegrantesEquipos] = useState<{
    [equipoId: number]: any[];
  }>({});
  const [loadingDetalles, setLoadingDetalles] = useState<Set<number>>(
    new Set()
  );

  // Estado para tabs de torneos tipo Liga (0)
  const [tabsLiga, setTabsLiga] = useState<
    Record<number, "posiciones" | "partidos">
  >({});

  // Estado para fecha seleccionada en cada torneo
  const [fechaSeleccionada, setFechaSeleccionada] = useState<
    Record<number, number>
  >({});

  const [filtros, setFiltros] = useState({
    busqueda: "",
    estado: "all",
    deporte: "all",
    tipoParticipacion: "all",
  });

  const [formData, setFormData] = useState({
    nombre: "",
    idDeporte: 0,
    fechaInicio: "",
    fechaFin: "",
    descripcion: "",
    maxParticipantes: "",
    premioGanador: "",
  });

  useEffect(() => {
    fetchTorneos();
    fetchDeportes();
  }, []);

  const fetchTorneos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/torneos");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTorneos(data);
    } catch (error: any) {
      console.error("Error fetching torneos:", error);
      setError(`Error al cargar torneos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeportes = async () => {
    try {
      const response = await fetch("/api/deportes");
      if (response.ok) {
        const data = await response.json();
        setDeportes(data);
      }
    } catch (error) {
      console.error("Error fetching deportes:", error);
    }
  };

  const fetchTorneoDetalle = async (torneoId: number) => {
    const newLoadingDetalles = new Set(loadingDetalles);
    newLoadingDetalles.add(torneoId);
    setLoadingDetalles(newLoadingDetalles);

    try {
      // Obtener detalles del torneo
      const torneoResponse = await fetch(`/api/torneos/${torneoId}`);
      if (torneoResponse.ok) {
        const torneoData = await torneoResponse.json();
        setTorneosDetalle((prev) => ({ ...prev, [torneoId]: torneoData }));
      }

      // Obtener participantes
      const participantesResponse = await fetch(
        `/api/torneos/${torneoId}/participantes`
      );
      if (participantesResponse.ok) {
        const participantesData = await participantesResponse.json();
        console.log("Participantes del torneo:", participantesData);
        setParticipantesPorTorneo((prev) => ({
          ...prev,
          [torneoId]: participantesData,
        }));
      }

      // Obtener partidos
      const partidosResponse = await fetch(
        `/api/partidos?torneoId=${torneoId}`
      );
      if (partidosResponse.ok) {
        const partidosData = await partidosResponse.json();
        // Ordenar partidos por fecha (menor a mayor)
        const partidosOrdenados = partidosData.sort(
          (a: Partido, b: Partido) => {
            if (!a.FechaHora) return 1;
            if (!b.FechaHora) return -1;
            return (
              new Date(a.FechaHora).getTime() - new Date(b.FechaHora).getTime()
            );
          }
        );
        setPartidosPorTorneo((prev) => ({
          ...prev,
          [torneoId]: partidosOrdenados,
        }));

        // Establecer la fecha por defecto (primera fecha no completada o la menor)
        const fechas = obtenerFechasUnicas(partidosOrdenados);
        if (fechas.length > 0) {
          const primeraFechaNoCompletada = fechas.find((fecha) => {
            const partidosFecha = partidosOrdenados.filter(
              (p: Partido) => p.FixtureNombre === `Fecha ${fecha}`
            );
            return partidosFecha.some((p: Partido) => p.Estado === 0); // Pendiente
          });
          setFechaSeleccionada((prev) => ({
            ...prev,
            [torneoId]: primeraFechaNoCompletada || fechas[0],
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching torneo detalle:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles del torneo",
        variant: "destructive",
      });
    } finally {
      const newLoadingDetalles = new Set(loadingDetalles);
      newLoadingDetalles.delete(torneoId);
      setLoadingDetalles(newLoadingDetalles);
    }
  };

  const toggleTorneo = (torneoId: number) => {
    const newExpandidos = new Set(torneosExpandidos);
    if (newExpandidos.has(torneoId)) {
      newExpandidos.delete(torneoId);
    } else {
      newExpandidos.add(torneoId);
      if (!torneosDetalle[torneoId]) {
        fetchTorneoDetalle(torneoId);
      }
      // Establecer tab por defecto según tipo de torneo
      if (!tabsLiga[torneoId]) {
        setTabsLiga((prev) => ({ ...prev, [torneoId]: "posiciones" }));
      }
    }
    setTorneosExpandidos(newExpandidos);
  };

  // Obtener fechas únicas de los partidos
  const obtenerFechasUnicas = (partidos: Partido[]): number[] => {
    const fechas = new Set<number>();
    partidos.forEach((partido) => {
      const match = partido.FixtureNombre.match(/Fecha (\d+)/);
      if (match) {
        fechas.add(parseInt(match[1]));
      }
    });
    return Array.from(fechas).sort((a, b) => a - b);
  };

  // Calcular tabla de posiciones
  const calcularTablaPosiciones = (torneoId: number) => {
    const partidos = partidosPorTorneo[torneoId] || [];
    const participantes = participantesPorTorneo[torneoId] || [];

    const tabla = participantes.map((participante) => {
      let pj = 0,
        pg = 0,
        pe = 0,
        pp = 0;

      partidos.forEach((partido) => {
        // Solo contar partidos finalizados
        if (partido.Estado !== 2) return;

        const esParticipanteA = partido.ParticipanteA === participante.nombre;
        const esParticipanteB = partido.ParticipanteB === participante.nombre;

        if (!esParticipanteA && !esParticipanteB) return;

        pj++;

        // Aquí deberías tener el resultado del partido
        // Por ahora asumimos que el ganador está marcado de alguna forma
        // TODO: Necesitarás agregar ResultadoA y ResultadoB en la interfaz Partido
      });

      return {
        participante: participante.nombre,
        pj,
        pg,
        pe,
        pp,
        puntos: pg * 3 + pe * 1, // Puntuación estándar
      };
    });

    // Ordenar por puntos, luego por PG
    return tabla.sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      if (b.pg !== a.pg) return b.pg - a.pg;
      return b.pj - a.pj;
    });
  };

  const toggleEquipo = async (torneoId: number, equipoId: number) => {
    const key = `${torneoId}-${equipoId}`;
    const newExpandidos = new Set(equiposExpandidos);

    if (newExpandidos.has(key)) {
      newExpandidos.delete(key);
    } else {
      newExpandidos.add(key);
      // Fetch solo si no lo tenemos ya
      if (!integrantesEquipos[equipoId]) {
        try {
          const res = await fetch(`/api/equipos/${equipoId}/integrantes`);
          if (res.ok) {
            const data = await res.json();
            setIntegrantesEquipos((prev) => ({ ...prev, [equipoId]: data }));
          } else {
            setIntegrantesEquipos((prev) => ({ ...prev, [equipoId]: [] }));
          }
        } catch (error) {
          console.error(error);
          setIntegrantesEquipos((prev) => ({ ...prev, [equipoId]: [] }));
        }
      }
    }

    setEquiposExpandidos(newExpandidos);
  };

  const handleCreateTorneo = async () => {
    if (!formData.nombre || !formData.idDeporte || !formData.fechaInicio) {
      toast({
        title: "Error",
        description: "Nombre, disciplina y fecha de inicio son requeridos.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/torneos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          idDeporte: formData.idDeporte,
          fechaInicio: formData.fechaInicio,
          fechaFin: formData.fechaFin || null,
          descripcion: formData.descripcion || null,
          maxParticipantes: formData.maxParticipantes
            ? Number.parseInt(formData.maxParticipantes)
            : null,
          premioGanador: formData.premioGanador || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Torneo creado exitosamente.",
        });
        setShowCreateDialog(false);
        setFormData({
          nombre: "",
          idDeporte: 0,
          fechaInicio: "",
          fechaFin: "",
          descripcion: "",
          maxParticipantes: "",
          premioGanador: "",
        });
        fetchTorneos();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al crear el torneo.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error creating torneo:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el torneo.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCancelarTorneo = async (torneoId: number) => {
    try {
      const response = await fetch(`/api/torneos/${torneoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: 3 }), // 3 = Cancelado
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Torneo cancelado exitosamente.",
        });
        fetchTorneos();
        // Actualizar el detalle si está expandido
        if (torneosExpandidos.has(torneoId)) {
          fetchTorneoDetalle(torneoId);
        }
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al cancelar el torneo.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error canceling torneo:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cancelar el torneo.",
        variant: "destructive",
      });
    }
  };

  const getTipoParticipacion = (disciplina: string) => {
    // Ejemplo: fútbol, voley → equipos; ajedrez → socio
    const deportesEquipo = ["Fútbol", "Voley", "Básquet"];
    if (deportesEquipo.includes(disciplina)) return "equipo";
    return "socio";
  };

  const getEstadoBadge = (estado: number) => {
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

  const getParticipanteIcon = (participante: Participante) => {
    return Number(participante.esEquipo) === 1 ? (
      <Users className="h-4 w-4 text-blue-600" />
    ) : (
      <User className="h-4 w-4 text-green-600" />
    );
  };

  const handleVolver = () => {
    router.push("/dashboard");
  };

  const handleGenerarFixture = () => {
    router.push("/torneos/fixture");
  };

  const handleRegistrarResultados = () => {
    router.push("/torneos/resultados");
  };

  const handleVerPartido = (partidoId: number) => {
    router.push(`/partidos/${partidoId}`);
  };

  const filteredTorneos = torneos
    .filter((torneo) => {
      // Filtro de búsqueda
      if (filtros.busqueda) {
        const busquedaLower = filtros.busqueda.toLowerCase();
        const nombreMatch =
          torneo.Nombre?.toLowerCase().includes(busquedaLower) || false;
        const deporteMatch =
          torneo.NombreDeporte?.toLowerCase().includes(busquedaLower) || false;
        if (!nombreMatch && !deporteMatch) {
          return false;
        }
      }

      // Filtro por estado
      if (
        filtros.estado &&
        filtros.estado !== "all" &&
        torneo.Estado.toString() !== filtros.estado
      ) {
        return false;
      }

      // Filtro por deporte
      if (
        filtros.deporte !== "all" &&
        torneo.NombreDeporte !== filtros.deporte
      ) {
        return false;
      }

      // Filtro por tipo de participación
      if (filtros.tipoParticipacion && filtros.tipoParticipacion !== "all") {
        const tipoTorneo = getTipoParticipacion(torneo.NombreDeporte);
        if (
          filtros.tipoParticipacion !== "all" &&
          tipoTorneo !== filtros.tipoParticipacion
        ) {
          return false;
        }
      }

      return true;
    })
    // 🔎 Ordenar torneos: Activos → Pendientes → Finalizados → Cancelados
    .sort((a, b) => {
      const orden: Record<number, number> = { 1: 0, 0: 1, 2: 2, 3: 3 };
      return (orden[a.Estado] ?? 0) - (orden[b.Estado] ?? 0);
    });

  // Calculate statistics
  const totalTorneos = torneos.length;
  const torneosActivos = torneos.filter((t) => t.Estado === 1).length;
  const proximosTorneos = torneos.filter(
    (t) => t.Estado === 0 && new Date(t.FechaInicio) > new Date()
  ).length;
  const participantesTotales = torneos.reduce(
    (sum, t) => sum + t.Participantes,
    0
  );

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
          <p className="text-gray-600">
            Administra los torneos deportivos del club
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Torneos Activos
              </CardTitle>
              <Trophy className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {torneosActivos}
              </div>
              <p className="text-xs text-muted-foreground">
                En curso actualmente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Participantes Totales
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {participantesTotales}
              </div>
              <p className="text-xs text-muted-foreground">
                En todos los torneos activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Próximos Torneos
              </CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {proximosTorneos}
              </div>
              <p className="text-xs text-muted-foreground">
                Planificado para iniciar pronto
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Torneos
              </CardTitle>
              <Trophy className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-700">
                {totalTorneos}
              </div>
              <p className="text-xs text-muted-foreground">
                Registrados en el sistema
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-12 flex items-center gap-2 bg-transparent"
              >
                <Plus className="h-5 w-5" />
                Nuevo Torneo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Torneo</DialogTitle>
                <DialogDescription>
                  Completa la información para crear un nuevo torneo
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre del Torneo</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      placeholder="Ej: Copa de Verano 2024"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="idDeporte">Deporte</Label>
                    <Select
                      value={formData.idDeporte.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, idDeporte: Number(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un deporte" />
                      </SelectTrigger>
                      <SelectContent>
                        {deportes.map((deporte) => (
                          <SelectItem
                            key={deporte.IdDeporte}
                            value={deporte.IdDeporte.toString()}
                          >
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fechaInicio: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fechaFin">Fecha de Fin (Opcional)</Label>
                    <Input
                      id="fechaFin"
                      type="date"
                      value={formData.fechaFin}
                      onChange={(e) =>
                        setFormData({ ...formData, fechaFin: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="maxParticipantes">
                      Máximo Participantes
                    </Label>
                    <Input
                      id="maxParticipantes"
                      type="number"
                      value={formData.maxParticipantes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxParticipantes: e.target.value,
                        })
                      }
                      placeholder="Ej: 16"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="premioGanador">Premio Ganador</Label>
                    <Input
                      id="premioGanador"
                      value={formData.premioGanador}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          premioGanador: e.target.value,
                        })
                      }
                      placeholder="Ej: $10,000"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    placeholder="Descripción del torneo..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
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
            Administrar Fixtures
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

        {/* Búsqueda */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Torneos</CardTitle>
                <CardDescription>
                  Lista de todos los torneos del club
                </CardDescription>
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
        </Card>

        {/* Lista de Torneos con Dropdown */}
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
          <div className="text-center py-8 text-gray-600">
            No se encontraron torneos.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTorneos.map((torneo) => (
              <Card key={torneo.IdTorneo} className="overflow-hidden">
                {/* Header del Torneo */}
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleTorneo(torneo.IdTorneo)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {torneosExpandidos.has(torneo.IdTorneo) ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <Trophy className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {torneo.Nombre}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4">
                          <span>{torneo.NombreDeporte}</span>
                          <span>•</span>
                          <span>
                            {format(new Date(torneo.FechaInicio), "dd/MM/yyyy")}
                          </span>
                          <span>•</span>
                          <span>{torneo.Participantes} participantes</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getEstadoBadge(torneo.Estado)}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/torneos/editar/${torneo.IdTorneo}`)
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Torneo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {torneo.Estado !== 3 && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cancelar Torneo
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    ¿Cancelar torneo?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción cancelará el torneo "
                                    {torneo.Nombre}". Los participantes serán
                                    notificados. Esta acción no se puede
                                    deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleCancelarTorneo(torneo.IdTorneo)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Sí, cancelar torneo
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                {/* Contenido Expandido */}
                {torneosExpandidos.has(torneo.IdTorneo) && (
                  <CardContent className="border-t bg-gray-50 p-0">
                    {loadingDetalles.has(torneo.IdTorneo) ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Cargando detalles...
                      </div>
                    ) : torneosDetalle[torneo.IdTorneo] ? (
                      <div className="space-y-6 py-4 px-4">
                        {/* Información del Torneo */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg">
                          <div>
                            <h4 className="font-semibold text-gray-700">
                              Fechas
                            </h4>
                            <p className="text-sm">
                              Inicio:{" "}
                              {format(
                                new Date(
                                  torneosDetalle[torneo.IdTorneo].FechaInicio
                                ),
                                "dd/MM/yyyy"
                              )}
                            </p>
                            {torneosDetalle[torneo.IdTorneo].FechaFin && (
                              <p className="text-sm">
                                Fin:{" "}
                                {format(
                                  new Date(
                                    torneosDetalle[torneo.IdTorneo].FechaFin
                                  ),
                                  "dd/MM/yyyy"
                                )}
                              </p>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700">
                              Participantes
                            </h4>
                            <p className="text-sm">
                              {
                                torneosDetalle[torneo.IdTorneo]
                                  .ParticipantesActuales
                              }
                              {torneosDetalle[torneo.IdTorneo]
                                .MaxParticipantes &&
                                ` / ${
                                  torneosDetalle[torneo.IdTorneo]
                                    .MaxParticipantes
                                }`}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700">
                              Premio
                            </h4>
                            <p className="text-sm">
                              {torneosDetalle[torneo.IdTorneo].PremioGanador ||
                                "No especificado"}
                            </p>
                          </div>
                        </div>

                        {torneosDetalle[torneo.IdTorneo].Descripcion && (
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-2">
                              Descripción
                            </h4>
                            <p className="text-blue-700">
                              {torneosDetalle[torneo.IdTorneo].Descripcion}
                            </p>
                          </div>
                        )}

                        {/* Contenido Principal: Participantes y Partidos */}
                        {/* Si es torneo de eliminación (bracket), mostrar en modo especial */}
                        {torneo.TipoTorneo === 1 ? (
                          <div className="space-y-4">
                            {/* Participantes en una fila horizontal compacta */}
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  <Users className="h-4 w-4" />
                                  Participantes (
                                  {participantesPorTorneo[torneo.IdTorneo]
                                    ?.length || 0}
                                  )
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                {!participantesPorTorneo[torneo.IdTorneo] ||
                                participantesPorTorneo[torneo.IdTorneo]
                                  .length === 0 ? (
                                  <p className="text-gray-500 text-center py-4 text-sm">
                                    No hay participantes inscritos
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {participantesPorTorneo[
                                      torneo.IdTorneo
                                    ].map((participante) => (
                                      <div key={participante.id}>
                                        {Number(participante.esEquipo) === 1 &&
                                        participante.equipoId ? (
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Badge
                                                variant="outline"
                                                className="flex items-center gap-1 px-3 py-1 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                                onClick={() =>
                                                  toggleEquipo(
                                                    torneo.IdTorneo,
                                                    participante.equipoId!
                                                  )
                                                }
                                              >
                                                {getParticipanteIcon(
                                                  participante
                                                )}
                                                <span className="text-blue-600 hover:text-blue-700">
                                                  {participante.nombre}
                                                </span>
                                              </Badge>
                                            </DialogTrigger>

                                            {equiposExpandidos.has(
                                              `${torneo.IdTorneo}-${participante.equipoId}`
                                            ) && (
                                              <DialogContent className="w-96">
                                                <DialogHeader>
                                                  <DialogTitle>
                                                    Integrantes del equipo
                                                  </DialogTitle>
                                                  <DialogDescription>
                                                    Listado de socios que forman
                                                    parte del equipo{" "}
                                                    {participante.nombre}
                                                  </DialogDescription>
                                                </DialogHeader>

                                                <div className="mt-2 space-y-1">
                                                  {integrantesEquipos[
                                                    participante.equipoId
                                                  ]?.length > 0 ? (
                                                    integrantesEquipos[
                                                      participante.equipoId
                                                    ].map((i: any) => (
                                                      <div
                                                        key={i.IdSocio}
                                                        className="flex items-center gap-2"
                                                      >
                                                        <User className="h-4 w-4 text-green-600" />
                                                        <span>
                                                          {i.Nombre}{" "}
                                                          {i.Apellido}
                                                        </span>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <span className="text-gray-500 text-sm">
                                                      No hay integrantes en este
                                                      equipo
                                                    </span>
                                                  )}
                                                </div>
                                              </DialogContent>
                                            )}
                                          </Dialog>
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className="flex items-center gap-1 px-3 py-1"
                                          >
                                            {getParticipanteIcon(participante)}
                                            <span>{participante.nombre}</span>
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Bracket ocupa todo el ancho */}
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  <Calendar className="h-4 w-4" />
                                  Bracket de Eliminación (
                                  {partidosPorTorneo[torneo.IdTorneo]?.length ||
                                    0}{" "}
                                  partidos)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                {!partidosPorTorneo[torneo.IdTorneo] ||
                                partidosPorTorneo[torneo.IdTorneo].length ===
                                  0 ? (
                                  <div className="text-center py-8">
                                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">
                                      No se han generado partidos todavía
                                    </p>
                                    <Button
                                      onClick={handleGenerarFixture}
                                      className="bg-yellow-600 hover:bg-yellow-700"
                                    >
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Generar Fixture
                                    </Button>
                                  </div>
                                ) : (
                                  <BracketView
                                    partidos={
                                      partidosPorTorneo[torneo.IdTorneo]
                                    }
                                  />
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        ) : torneo.TipoTorneo === 0 ? (
                          // Torneo tipo LIGA - Tabs con Posiciones y Partidos por Fecha
                          <div className="space-y-4">
                            {/* Participantes en una fila horizontal compacta */}
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  <Users className="h-4 w-4" />
                                  Participantes (
                                  {participantesPorTorneo[torneo.IdTorneo]
                                    ?.length || 0}
                                  )
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                {!participantesPorTorneo[torneo.IdTorneo] ||
                                participantesPorTorneo[torneo.IdTorneo]
                                  .length === 0 ? (
                                  <p className="text-gray-500 text-center py-4 text-sm">
                                    No hay participantes inscritos
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {participantesPorTorneo[
                                      torneo.IdTorneo
                                    ].map((participante) => (
                                      <div key={participante.id}>
                                        {Number(participante.esEquipo) === 1 &&
                                        participante.equipoId ? (
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Badge
                                                variant="outline"
                                                className="flex items-center gap-1 px-3 py-1 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                                onClick={() =>
                                                  toggleEquipo(
                                                    torneo.IdTorneo,
                                                    participante.equipoId!
                                                  )
                                                }
                                              >
                                                {getParticipanteIcon(
                                                  participante
                                                )}
                                                <span className="text-blue-600 hover:text-blue-700">
                                                  {participante.nombre}
                                                </span>
                                              </Badge>
                                            </DialogTrigger>

                                            {equiposExpandidos.has(
                                              `${torneo.IdTorneo}-${participante.equipoId}`
                                            ) && (
                                              <DialogContent className="w-96">
                                                <DialogHeader>
                                                  <DialogTitle>
                                                    Integrantes del equipo
                                                  </DialogTitle>
                                                  <DialogDescription>
                                                    Listado de socios que forman
                                                    parte del equipo{" "}
                                                    {participante.nombre}
                                                  </DialogDescription>
                                                </DialogHeader>

                                                <div className="mt-2 space-y-1">
                                                  {integrantesEquipos[
                                                    participante.equipoId
                                                  ]?.length > 0 ? (
                                                    integrantesEquipos[
                                                      participante.equipoId
                                                    ].map((i: any) => (
                                                      <div
                                                        key={i.IdSocio}
                                                        className="flex items-center gap-2"
                                                      >
                                                        <User className="h-4 w-4 text-green-600" />
                                                        <span>
                                                          {i.Nombre}{" "}
                                                          {i.Apellido}
                                                        </span>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <span className="text-gray-500 text-sm">
                                                      No hay integrantes en este
                                                      equipo
                                                    </span>
                                                  )}
                                                </div>
                                              </DialogContent>
                                            )}
                                          </Dialog>
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className="flex items-center gap-1 px-3 py-1"
                                          >
                                            {getParticipanteIcon(participante)}
                                            <span>{participante.nombre}</span>
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            <Tabs
                              value={tabsLiga[torneo.IdTorneo] || "posiciones"}
                              onValueChange={(value) =>
                                setTabsLiga((prev) => ({
                                  ...prev,
                                  [torneo.IdTorneo]: value as
                                    | "posiciones"
                                    | "partidos",
                                }))
                              }
                              className="w-full"
                            >
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="posiciones">
                                  <Trophy className="h-4 w-4 mr-2" />
                                  Tabla de Posiciones
                                </TabsTrigger>
                                <TabsTrigger value="partidos">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Partidos por Fecha
                                </TabsTrigger>
                              </TabsList>

                              {/* Tab de Tabla de Posiciones */}
                              <TabsContent
                                value="posiciones"
                                className="space-y-4"
                              >
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                      <Trophy className="h-5 w-5 text-yellow-600" />
                                      Tabla de Posiciones
                                    </CardTitle>
                                    <CardDescription>
                                      Clasificación actual del torneo
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    {!partidosPorTorneo[torneo.IdTorneo] ||
                                    partidosPorTorneo[torneo.IdTorneo]
                                      .length === 0 ? (
                                      <div className="text-center py-8">
                                        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500 mb-4">
                                          No se han generado partidos todavía
                                        </p>
                                        <Button
                                          onClick={handleGenerarFixture}
                                          className="bg-yellow-600 hover:bg-yellow-700"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Generar Fixture
                                        </Button>
                                      </div>
                                    ) : (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-12">
                                              #
                                            </TableHead>
                                            <TableHead>Participante</TableHead>
                                            <TableHead className="text-center">
                                              PJ
                                            </TableHead>
                                            <TableHead className="text-center">
                                              PG
                                            </TableHead>
                                            <TableHead className="text-center">
                                              PE
                                            </TableHead>
                                            <TableHead className="text-center">
                                              PP
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {calcularTablaPosiciones(
                                            torneo.IdTorneo
                                          ).map((fila, index) => (
                                            <TableRow key={fila.participante}>
                                              <TableCell className="font-medium">
                                                {index + 1}
                                              </TableCell>
                                              <TableCell className="font-semibold">
                                                {fila.participante}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {fila.pj}
                                              </TableCell>
                                              <TableCell className="text-center text-green-600 font-semibold">
                                                {fila.pg}
                                              </TableCell>
                                              <TableCell className="text-center text-gray-600">
                                                {fila.pe}
                                              </TableCell>
                                              <TableCell className="text-center text-red-600 font-semibold">
                                                {fila.pp}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </CardContent>
                                </Card>
                              </TabsContent>

                              {/* Tab de Partidos por Fecha */}
                              <TabsContent
                                value="partidos"
                                className="space-y-4"
                              >
                                <Card>
                                  <CardHeader>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <CardTitle className="flex items-center gap-2">
                                          <Calendar className="h-5 w-5 text-blue-600" />
                                          Partidos
                                        </CardTitle>
                                        <CardDescription>
                                          Resultados y próximos encuentros
                                        </CardDescription>
                                      </div>
                                      {partidosPorTorneo[torneo.IdTorneo] &&
                                        partidosPorTorneo[torneo.IdTorneo]
                                          .length > 0 && (
                                          <Select
                                            value={
                                              fechaSeleccionada[
                                                torneo.IdTorneo
                                              ]?.toString() || "1"
                                            }
                                            onValueChange={(value) =>
                                              setFechaSeleccionada((prev) => ({
                                                ...prev,
                                                [torneo.IdTorneo]:
                                                  parseInt(value),
                                              }))
                                            }
                                          >
                                            <SelectTrigger className="w-[180px]">
                                              <SelectValue placeholder="Seleccionar fecha" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {obtenerFechasUnicas(
                                                partidosPorTorneo[
                                                  torneo.IdTorneo
                                                ]
                                              ).map((fecha) => (
                                                <SelectItem
                                                  key={fecha}
                                                  value={fecha.toString()}
                                                >
                                                  Fecha {fecha}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    {!partidosPorTorneo[torneo.IdTorneo] ||
                                    partidosPorTorneo[torneo.IdTorneo]
                                      .length === 0 ? (
                                      <div className="text-center py-8">
                                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500 mb-4">
                                          No se han generado partidos todavía
                                        </p>
                                        <Button
                                          onClick={handleGenerarFixture}
                                          className="bg-yellow-600 hover:bg-yellow-700"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Generar Fixture
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {partidosPorTorneo[torneo.IdTorneo]
                                          .filter((partido) => {
                                            const match =
                                              partido.FixtureNombre.match(
                                                /Fecha (\d+)/
                                              );
                                            return (
                                              match &&
                                              parseInt(match[1]) ===
                                                (fechaSeleccionada[
                                                  torneo.IdTorneo
                                                ] || 1)
                                            );
                                          })
                                          .map((partido) => (
                                            <div
                                              key={partido.IdPartido}
                                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                              <div className="flex items-center gap-4 flex-1">
                                                <div className="text-center min-w-[120px]">
                                                  {partido.FechaHora ? (
                                                    <>
                                                      <div className="text-sm font-medium">
                                                        {format(
                                                          new Date(
                                                            partido.FechaHora
                                                          ),
                                                          "dd/MM/yyyy"
                                                        )}
                                                      </div>
                                                      <div className="text-xs text-gray-500">
                                                        {format(
                                                          new Date(
                                                            partido.FechaHora
                                                          ),
                                                          "HH:mm"
                                                        )}
                                                      </div>
                                                    </>
                                                  ) : (
                                                    <span className="text-sm text-gray-400">
                                                      Sin fecha
                                                    </span>
                                                  )}
                                                </div>

                                                <div className="flex-1 grid grid-cols-3 items-center gap-2">
                                                  <div className="text-right font-medium">
                                                    {partido.ParticipanteA ||
                                                      "TBD"}
                                                  </div>
                                                  <div className="text-center text-sm text-gray-500 font-semibold">
                                                    VS
                                                  </div>
                                                  <div className="text-left font-medium">
                                                    {partido.ParticipanteB ||
                                                      "TBD"}
                                                  </div>
                                                </div>

                                                <Badge
                                                  variant={
                                                    partido.Estado === 0
                                                      ? "secondary"
                                                      : partido.Estado === 1
                                                      ? "default"
                                                      : "outline"
                                                  }
                                                  className="min-w-[100px] justify-center"
                                                >
                                                  {partido.Estado === 0
                                                    ? "Pendiente"
                                                    : partido.Estado === 1
                                                    ? "En Curso"
                                                    : "Finalizado"}
                                                </Badge>
                                              </div>

                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  handleVerPartido(
                                                    partido.IdPartido
                                                  )
                                                }
                                              >
                                                <Eye className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </TabsContent>
                            </Tabs>
                          </div>
                        ) : (
                          // Layout normal en grid para torneos que NO son de eliminación
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Participantes - Columna más pequeña */}
                            <Card className="lg:col-span-1">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  <Users className="h-4 w-4" />
                                  Participantes (
                                  {participantesPorTorneo[torneo.IdTorneo]
                                    ?.length || 0}
                                  )
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                {!participantesPorTorneo[torneo.IdTorneo] ||
                                participantesPorTorneo[torneo.IdTorneo]
                                  .length === 0 ? (
                                  <p className="text-gray-500 text-center py-4 text-sm">
                                    No hay participantes inscritos
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {participantesPorTorneo[
                                      torneo.IdTorneo
                                    ].map((participante) => (
                                      <div
                                        key={participante.id}
                                        className="border rounded-lg p-3 bg-white flex items-center justify-between"
                                      >
                                        <div className="flex items-center gap-2">
                                          {getParticipanteIcon(participante)}
                                          <span>{participante.nombre}</span>
                                          <Badge>{participante.tipo}</Badge>
                                        </div>

                                        {participante.esEquipo &&
                                          participante.equipoId && (
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() =>
                                                    toggleEquipo(
                                                      torneo.IdTorneo,
                                                      participante.equipoId!
                                                    )
                                                  }
                                                >
                                                  <Eye className="h-4 w-4" />
                                                </Button>
                                              </DialogTrigger>

                                              {equiposExpandidos.has(
                                                `${torneo.IdTorneo}-${participante.equipoId}`
                                              ) && (
                                                <DialogContent className="w-96">
                                                  <DialogHeader>
                                                    <DialogTitle>
                                                      Integrantes del equipo
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                      Listado de socios que
                                                      forman parte del equipo{" "}
                                                      {participante.nombre}
                                                    </DialogDescription>
                                                  </DialogHeader>

                                                  <div className="mt-2 space-y-1">
                                                    {integrantesEquipos[
                                                      participante.equipoId
                                                    ]?.length > 0 ? (
                                                      integrantesEquipos[
                                                        participante.equipoId
                                                      ].map((i: any) => (
                                                        <div
                                                          key={i.IdSocio}
                                                          className="flex items-center gap-2"
                                                        >
                                                          <User className="h-4 w-4 text-green-600" />
                                                          <span>
                                                            {i.Nombre}{" "}
                                                            {i.Apellido}
                                                          </span>
                                                        </div>
                                                      ))
                                                    ) : (
                                                      <span className="text-gray-500 text-sm">
                                                        No hay integrantes en
                                                        este equipo
                                                      </span>
                                                    )}
                                                  </div>
                                                </DialogContent>
                                              )}
                                            </Dialog>
                                          )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Partidos - Columna más grande */}
                            <Card className="lg:col-span-2">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  <Calendar className="h-4 w-4" />
                                  Partidos (
                                  {partidosPorTorneo[torneo.IdTorneo]?.length ||
                                    0}
                                  )
                                  {torneo.TipoTorneo === 1 && (
                                    <Badge variant="outline" className="ml-2">
                                      Bracket
                                    </Badge>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                {!partidosPorTorneo[torneo.IdTorneo] ||
                                partidosPorTorneo[torneo.IdTorneo].length ===
                                  0 ? (
                                  <div className="text-center py-8">
                                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">
                                      No se han generado partidos todavía
                                    </p>
                                    <Button
                                      onClick={handleGenerarFixture}
                                      className="bg-yellow-600 hover:bg-yellow-700"
                                    >
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Generar Fixture
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {partidosPorTorneo[torneo.IdTorneo].map(
                                      (partido) => (
                                        <div
                                          key={partido.IdPartido}
                                          className="border rounded-lg p-3"
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline">
                                                {partido.FixtureNombre}
                                              </Badge>
                                              <span className="text-sm text-gray-600">
                                                {partido.Lugar}
                                              </span>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleVerPartido(
                                                  partido.IdPartido
                                                )
                                              }
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          <div className="text-center">
                                            <div className="font-medium">
                                              {partido.ParticipanteA || (
                                                <span className="text-gray-400 italic">
                                                  TBD
                                                </span>
                                              )}{" "}
                                              vs{" "}
                                              {partido.ParticipanteB || (
                                                <span className="text-gray-400 italic">
                                                  TBD
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-sm text-gray-600 flex items-center justify-center gap-2 mt-1">
                                              <Clock className="h-3 w-3" />
                                              <span>
                                                {partido.FechaHora
                                                  ? `${format(
                                                      new Date(
                                                        partido.FechaHora
                                                      ),
                                                      "dd/MM/yyyy"
                                                    )} - ${format(
                                                      new Date(
                                                        partido.FechaHora
                                                      ),
                                                      "HH:mm"
                                                    )}`
                                                  : "Próximamente"}
                                              </span>
                                            </div>
                                            {partido.ArbitroNombre && (
                                              <div className="text-xs text-gray-500 mt-1">
                                                Árbitro: {partido.ArbitroNombre}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
