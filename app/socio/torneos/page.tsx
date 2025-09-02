"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Trophy,
  Users,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Loader2,
  ArrowLeft,
  UserMinus,
  UserPlus,
  Filter,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Torneo {
  IdTorneo: number;
  Nombre: string;
  Disciplina: string;
  FechaInicio: string;
  Estado: number;
  Participantes: number;
  Descripcion?: string;
  MaxParticipantes?: number;
  FechaFin?: string;
  PremioGanador?: string;
}

interface Equipo {
  IdEquipo: number;
  Nombre: string;
  Disciplina: string;
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
  FechaPartido: string;
  HoraPartido: string;
  EquipoA: string;
  EquipoB: string;
  Fase: string;
  Lugar: string;
  EstadoPartido: string;
  ArbitroId?: number;
  ArbitroNombre?: string;
}

interface InscripcionStatus {
  inscrito: boolean;
  participante?: {
    id: number;
    nombre: string;
    esEquipo: boolean;
    equipoId?: number;
    socioId?: number;
  };
}

interface Filtros {
  busqueda: string;
  estado: string;
  deporte: string;
  tipoParticipacion: string;
}

const DEPORTES_INDIVIDUALES = [
  "Tenis",
  "Ping Pong",
  "Ajedrez",
  "Natacion",
  "Atletismo",
  "Ciclismo",
  "Boxeo",
  "Karate",
  "Judo",
  "Taekwondo",
];

const DEPORTES_EQUIPOS = [
  "Futbol",
  "Futbol 5",
  "Basquet",
  "Voley",
  "Handball",
  "Hockey",
  "Rugby",
  "Tenis",
  "Paddle",
];

export default function TorneosPage() {
  const router = useRouter();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [deportes, setDeportes] = useState<string[]>([]);
  const [inscripciones, setInscripciones] = useState<
    Record<number, InscripcionStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<number | null>(null);
  const { toast } = useToast();

  // Estado para filtros
  const [filtros, setFiltros] = useState<Filtros>({
    busqueda: "",
    estado: "",
    deporte: "",
    tipoParticipacion: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estado para vista expandida
  const [torneoExpandido, setTorneoExpandido] = useState<number | null>(null);
  const [torneosDetalle, setTorneosDetalle] = useState<Record<number, Torneo>>(
    {}
  );
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

  // Simular socioId - en producción vendría del contexto de autenticación
  const socioId = 1;

  useEffect(() => {
    fetchTorneos();
    fetchEquipos();
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

      // Verificar inscripciones para cada torneo
      for (const torneo of data) {
        await checkInscripcion(torneo.IdTorneo);
      }
    } catch (error: any) {
      console.error("Error fetching torneos:", error);
      setError(`Error al cargar torneos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipos = async () => {
    try {
      const response = await fetch(`/api/equipos?socioId=${socioId}`);
      if (response.ok) {
        const data = await response.json();
        setEquipos(data);
      }
    } catch (error) {
      console.error("Error fetching equipos:", error);
    }
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

  const fetchDeportes = async () => {
    try {
      const response = await fetch("/api/deportes");
      if (response.ok) {
        const data = await response.json();
        setDeportes(data.map((d: any) => d.Nombre || d));
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
        console.log("Participantes del torneo:", participantesData); // 👈 acá vemos los equipoId
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
        setPartidosPorTorneo((prev) => ({ ...prev, [torneoId]: partidosData }));
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

  const handleTorneoClick = (torneoId: number) => {
    if (torneoExpandido === torneoId) {
      setTorneoExpandido(null);
    } else {
      setTorneoExpandido(torneoId);
      if (!torneosDetalle[torneoId]) {
        fetchTorneoDetalle(torneoId);
      }
    }
  };

  const checkInscripcion = async (torneoId: number) => {
    try {
      const response = await fetch(
        `/api/torneos/${torneoId}/mi-inscripcion?socioId=${socioId}`
      );
      if (response.ok) {
        const data = await response.json();
        setInscripciones((prev) => ({
          ...prev,
          [torneoId]: data,
        }));
      }
    } catch (error) {
      console.error("Error checking inscripción:", error);
    }
  };

  const handleInscripcion = async (
    torneoId: number,
    tipoInscripcion: string,
    equipoId?: number
  ) => {
    setProcesando(torneoId);
    try {
      const response = await fetch(`/api/torneos/${torneoId}/inscribir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          socioId,
          tipoInscripcion,
          equipoId: tipoInscripcion === "equipo" ? equipoId : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "¡Inscripción exitosa!",
          description: data.message,
        });
        await checkInscripcion(torneoId);
        await fetchTorneos(); // Actualizar contador de participantes
        if (torneoExpandido === torneoId) {
          await fetchTorneoDetalle(torneoId); // Actualizar vista expandida
        }
      } else {
        toast({
          title: "Error en la inscripción",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error inscribiendo:", error);
      toast({
        title: "Error",
        description: "Error al procesar la inscripción",
        variant: "destructive",
      });
    } finally {
      setProcesando(null);
    }
  };

  const handleDesinscripcion = async (torneoId: number) => {
    setProcesando(torneoId);
    try {
      const response = await fetch(`/api/torneos/${torneoId}/desinscribir`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ socioId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Desinscripción exitosa",
          description: data.message,
        });
        await checkInscripcion(torneoId);
        await fetchTorneos(); // Actualizar contador de participantes
        if (torneoExpandido === torneoId) {
          await fetchTorneoDetalle(torneoId); // Actualizar vista expandida
        }
      } else {
        toast({
          title: "Error en la desinscripción",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error desinscribiendo:", error);
      toast({
        title: "Error",
        description: "Error al procesar la desinscripción",
        variant: "destructive",
      });
    } finally {
      setProcesando(null);
    }
  };

  const handleVerPartido = (partidoId: number) => {
    router.push(`/partidos/${partidoId}`);
  };

  const getParticipanteIcon = (participante: Participante) => {
    return Number(participante.esEquipo) === 1 ? (
      <Users className="h-4 w-4 text-blue-600" />
    ) : (
      <User className="h-4 w-4 text-green-600" />
    );
  };

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return <Badge variant="secondary">Pendiente</Badge>;
      case 1:
        return <Badge variant="default">En Curso</Badge>;
      case 2:
        return <Badge variant="outline">Finalizado</Badge>;
      case 3:
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quita acentos
      .trim();

  const getTipoDeporteBadge = (disciplina: string) => {
    if (!disciplina) {
      return <Badge variant="outline">No especificado</Badge>;
    }

    const esIndividual = DEPORTES_INDIVIDUALES.some((d) =>
      normalize(disciplina).includes(normalize(d))
    );
    const esEquipo = DEPORTES_EQUIPOS.some((d) =>
      normalize(disciplina).includes(normalize(d))
    );

    return (
      <div className="flex items-center gap-2">
        {esIndividual && (
          <Badge className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-100">
            <User className="h-3 w-3" /> Individual
          </Badge>
        )}
        {esEquipo && (
          <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Users className="h-3 w-3" /> Equipo
          </Badge>
        )}
        {!esIndividual && !esEquipo && <Badge variant="outline">Otro</Badge>}
      </div>
    );
  };

  const getTipoParticipacion = (disciplina: string) => {
    if (!disciplina) return "ambos";

    const disciplinaLower = disciplina.toLowerCase();
    const esIndividual = DEPORTES_INDIVIDUALES.some((d) =>
      disciplinaLower.includes(d.toLowerCase())
    );
    const esEquipo = DEPORTES_EQUIPOS.some((d) =>
      disciplinaLower.includes(d.toLowerCase())
    );

    if (esIndividual && esEquipo) {
      return "ambos";
    } else if (esIndividual) {
      return "individual";
    } else if (esEquipo) {
      return "equipo";
    } else {
      return "ambos";
    }
  };

  const InscripcionForm = ({ torneo }: { torneo: Torneo }) => {
    const [tipoInscripcion, setTipoInscripcion] =
      useState<string>("individual");
    const [equipoSeleccionado, setEquipoSeleccionado] = useState<string>("");

    const esIndividual = DEPORTES_INDIVIDUALES.some((d) =>
      torneo.Disciplina?.toLowerCase().includes(d.toLowerCase())
    );
    const esEquipo = DEPORTES_EQUIPOS.some((d) =>
      torneo.Disciplina?.toLowerCase().includes(d.toLowerCase())
    );

    const disciplinaLower = torneo.Disciplina?.toLowerCase() || "";
    const permiteIndividual = esIndividual;
    const permiteEquipos = esEquipo;

    const equiposCompatibles = equipos.filter(
      (equipo) => equipo.Disciplina?.toLowerCase() === disciplinaLower
    );

    const handleSubmit = () => {
      if (tipoInscripcion === "equipo" && !equipoSeleccionado) {
        toast({
          title: "Error",
          description: "Debes seleccionar un equipo",
          variant: "destructive",
        });
        return;
      }

      handleInscripcion(
        torneo.IdTorneo,
        tipoInscripcion,
        tipoInscripcion === "equipo"
          ? Number.parseInt(equipoSeleccionado)
          : undefined
      );
    };

    return (
      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Inscribirse al Torneo
        </h4>
        <RadioGroup value={tipoInscripcion} onValueChange={setTipoInscripcion}>
          {(permiteIndividual || (!permiteIndividual && !permiteEquipos)) && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="individual"
                id={`individual-${torneo.IdTorneo}`}
              />
              <Label
                htmlFor={`individual-${torneo.IdTorneo}`}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4 text-green-600" />
                Inscripción Individual
              </Label>
            </div>
          )}
          {(permiteEquipos || (!permiteIndividual && !permiteEquipos)) && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="equipo" id={`equipo-${torneo.IdTorneo}`} />
              <Label
                htmlFor={`equipo-${torneo.IdTorneo}`}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4 text-blue-600" />
                Inscripción por Equipo
              </Label>
            </div>
          )}
        </RadioGroup>

        {tipoInscripcion === "equipo" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Seleccionar equipo</Label>
            <Select
              value={equipoSeleccionado}
              onValueChange={setEquipoSeleccionado}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un equipo" />
              </SelectTrigger>
              <SelectContent>
                {equiposCompatibles.length === 0 ? (
                  <SelectItem value="" disabled>
                    No hay equipos compatibles
                  </SelectItem>
                ) : (
                  equiposCompatibles.map((equipo) => (
                    <SelectItem
                      key={equipo.IdEquipo}
                      value={equipo.IdEquipo.toString()}
                    >
                      {equipo.Nombre}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={procesando === torneo.IdTorneo}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {procesando === torneo.IdTorneo ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Procesando...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Inscribirse
            </>
          )}
        </Button>
      </div>
    );
  };

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: "",
      estado: "",
      deporte: "",
      tipoParticipacion: "",
    });
  };

  const filteredTorneos = torneos.filter((torneo) => {
    // Filtro por búsqueda
    if (filtros.busqueda) {
      const busquedaLower = filtros.busqueda.toLowerCase();
      const nombreMatch =
        torneo.Nombre?.toLowerCase().includes(busquedaLower) || false;
      const deporteMatch =
        torneo.Disciplina?.toLowerCase().includes(busquedaLower) || false;
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
      filtros.deporte &&
      filtros.deporte !== "all" &&
      torneo.Disciplina !== filtros.deporte
    ) {
      return false;
    }

    // Filtro por tipo de participación
    if (filtros.tipoParticipacion && filtros.tipoParticipacion !== "all") {
      const tipoTorneo = getTipoParticipacion(torneo.Disciplina);
      if (
        filtros.tipoParticipacion !== "ambos" &&
        tipoTorneo !== filtros.tipoParticipacion &&
        tipoTorneo !== "ambos"
      ) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
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
                onClick={() => router.push("/socio-dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
              </Button>
            </div>
          </div>
        </header>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <div className="text-lg">Cargando torneos...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
                onClick={() => router.push("/socio-dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
              </Button>
            </div>
          </div>
        </header>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error al cargar
            </h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchTorneos}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
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
            <Button
              variant="outline"
              onClick={() => router.push("/socio-dashboard")}
              className="flex items-center gap-2"
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
            <Trophy className="h-8 w-8 text-yellow-600" />
            Torneos Disponibles
          </h2>
          <p className="text-gray-600">
            Explora y participa en los torneos del club
          </p>
        </div>

        {/* Filtros y Búsqueda */}
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Filtros de Búsqueda
                </CardTitle>
                <CardDescription>
                  Encuentra torneos por diferentes criterios
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {mostrarFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Búsqueda básica */}
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nombre o deporte..."
                className="flex-1"
                value={filtros.busqueda}
                onChange={(e) =>
                  setFiltros({ ...filtros, busqueda: e.target.value })
                }
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtros avanzados */}
            {mostrarFiltros && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                {/* Filtro por Estado */}
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={filtros.estado}
                    onValueChange={(value) =>
                      setFiltros({ ...filtros, estado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="0">Pendiente</SelectItem>
                      <SelectItem value="1">En Curso</SelectItem>
                      <SelectItem value="2">Finalizado</SelectItem>
                      <SelectItem value="3">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Deporte */}
                <div className="space-y-2">
                  <Label>Deporte</Label>
                  <Select
                    value={filtros.deporte}
                    onValueChange={(value) =>
                      setFiltros({ ...filtros, deporte: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los deportes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los deportes</SelectItem>
                      {deportes.map((deporte) => (
                        <SelectItem key={deporte} value={deporte}>
                          {deporte}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Tipo de Participación */}
                <div className="space-y-2">
                  <Label>Tipo de Participación</Label>
                  <Select
                    value={filtros.tipoParticipacion}
                    onValueChange={(value) =>
                      setFiltros({ ...filtros, tipoParticipacion: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="equipo">Equipo</SelectItem>
                      <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botón Limpiar */}
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button
                    variant="outline"
                    onClick={limpiarFiltros}
                    className="w-full bg-transparent"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                </div>
              </div>
            )}

            {/* Contador de resultados */}
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              Mostrando{" "}
              <span className="font-semibold">{filteredTorneos.length}</span> de{" "}
              <span className="font-semibold">{torneos.length}</span> torneos
            </div>
          </CardContent>
        </Card>

        {/* Lista de Torneos */}
        <div className="space-y-4">
          {filteredTorneos.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron torneos
              </h3>
              <p className="text-gray-500">
                Intenta ajustar los filtros de búsqueda.
              </p>
            </div>
          ) : (
            filteredTorneos.map((torneo) => {
              const inscripcionStatus = inscripciones[torneo.IdTorneo];
              const estaInscrito = inscripcionStatus?.inscrito || false;
              const estaExpandido = torneoExpandido === torneo.IdTorneo;
              const torneoDetalle = torneosDetalle[torneo.IdTorneo];
              const participantes =
                participantesPorTorneo[torneo.IdTorneo] || [];
              const torneoDetalleActual =
                torneosDetalle[torneo.IdTorneo] || torneo;
              const partidos = partidosPorTorneo[torneo.IdTorneo] || [];
              const cargandoDetalle = loadingDetalles.has(torneo.IdTorneo);

              return (
                <div key={torneo.IdTorneo} className="space-y-0">
                  <Card
                    className={`transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                      estaInscrito
                        ? "bg-green-50 border-green-200 hover:bg-green-100"
                        : "hover:bg-gray-50"
                    } ${estaExpandido ? "ring-2 ring-blue-500 shadow-lg" : ""}`}
                    onClick={() => handleTorneoClick(torneo.IdTorneo)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center">
                            {estaExpandido ? (
                              <ChevronDown className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-lg">
                              {torneo.Nombre}
                            </CardTitle>
                            <CardDescription>
                              {torneo.Disciplina
                                ? torneo.Disciplina
                                : "Disciplina no especificada"}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {estaInscrito ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {getEstadoBadge(torneo.Estado)}
                        {getTipoDeporteBadge(torneo.Disciplina)}
                        {estaInscrito && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            ✓ Inscrito
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span>
                            {new Date(torneo.FechaInicio).toLocaleDateString()}
                          </span>
                        </div>

                        {torneo.FechaFin && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span>
                              {new Date(torneo.FechaFin).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-500" />
                          <span>
                            {participantesPorTorneo[torneo.IdTorneo]?.length ||
                              0}
                          </span>
                        </div>

                        {torneo.PremioGanador && (
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="truncate">
                              {torneo.PremioGanador}
                            </span>
                          </div>
                        )}
                      </div>

                      {torneo.Descripcion && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {torneo.Descripcion}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Vista Expandida del Torneo - Debajo del torneo específico */}
                  {estaExpandido && (
                    <Card className="transition-all duration-200 shadow-sm hover:shadow-md border border-blue-200">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <div>
                          <CardTitle className="text-xl text-blue-800">
                            Detalles de {torneoDetalle?.Nombre || torneo.Nombre}
                          </CardTitle>
                          <CardDescription className="text-blue-600">
                            {torneoDetalle?.Disciplina ||
                              torneo.Disciplina ||
                              "Deporte no especificado"}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {cargandoDetalle ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-600" />
                            <span className="text-gray-600">
                              Cargando detalles...
                            </span>
                          </div>
                        ) : torneoDetalle ? (
                          <div className="space-y-6">
                            {/* Información del Torneo */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                              <div>
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Fechas
                                </h4>
                                <p className="text-sm">
                                  Inicio:{" "}
                                  {format(
                                    new Date(torneoDetalle.FechaInicio),
                                    "dd/MM/yyyy"
                                  )}
                                </p>
                                {torneoDetalle.FechaFin && (
                                  <p className="text-sm">
                                    Fin:{" "}
                                    {format(
                                      new Date(torneoDetalle.FechaFin),
                                      "dd/MM/yyyy"
                                    )}
                                  </p>
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Participantes
                                </h4>
                                <p className="text-sm">
                                  {torneoDetalleActual.Participantes ||
                                    participantes.length}
                                  {torneoDetalleActual.MaxParticipantes &&
                                    ` / ${torneoDetalleActual.MaxParticipantes}`}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                  <Trophy className="h-4 w-4" />
                                  Premio
                                </h4>
                                <p className="text-sm">
                                  {torneoDetalle.PremioGanador ||
                                    "No especificado"}
                                </p>
                              </div>
                            </div>

                            {torneoDetalle.Descripcion && (
                              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 className="font-semibold text-blue-800 mb-2">
                                  Descripción
                                </h4>
                                <p className="text-blue-700">
                                  {torneoDetalle.Descripcion}
                                </p>
                              </div>
                            )}

                            {/* Botones de Acción - Solo dentro del dropdown */}
                            <div onClick={(e) => e.stopPropagation()}>
                              {estaInscrito ? (
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4" />
                                      Inscrito como:{" "}
                                      {inscripcionStatus.participante?.nombre}
                                    </div>
                                    {torneo.Estado === 0 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleDesinscripcion(torneo.IdTorneo)
                                        }
                                        disabled={
                                          procesando === torneo.IdTorneo
                                        }
                                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                      >
                                        <UserMinus className="h-4 w-4 mr-2" />
                                        {procesando === torneo.IdTorneo
                                          ? "Procesando..."
                                          : "Desinscribirse"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                torneo.Estado === 0 && (
                                  <InscripcionForm torneo={torneo} />
                                )
                              )}
                            </div>

                            {/* Contenido Principal: Participantes y Partidos */}
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
                                                              {i.Nombre}
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

                              {/* Partidos - Columna derecha más grande */}
                              <Card className="lg:col-span-2">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center gap-2 text-base">
                                    <Calendar className="h-4 w-4" />
                                    Partidos (
                                    {partidosPorTorneo[torneo.IdTorneo]
                                      ?.length || 0}
                                    )
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
                                                  {partido.Fase}
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
                                                {partido.EquipoA} vs{" "}
                                                {partido.EquipoB}
                                              </div>
                                              <div className="text-sm text-gray-600 flex items-center justify-center gap-2 mt-1">
                                                <Clock className="h-3 w-3" />
                                                {format(
                                                  new Date(
                                                    partido.FechaPartido
                                                  ),
                                                  "dd/MM/yyyy"
                                                )}{" "}
                                                - {partido.HoraPartido}
                                              </div>
                                              {partido.ArbitroNombre && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                  Árbitro:{" "}
                                                  {partido.ArbitroNombre}
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
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
