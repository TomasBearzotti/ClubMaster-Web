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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Equipo {
  IdEquipo: number;
  Nombre: string;
  IdDeporte: number;
  NombreDeporte: string;
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
  FixtureNombre: string; // Nombre del fixture (antes Fase)
  NumeroRonda?: number; // Número de ronda del fixture
  Lugar: string;
  Estado: number; // Estado del partido (0=Programado, 1=En Curso, 2=Finalizado)
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
  const [socioIdState, setSocioIdState] = useState<number | null>(null);
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

  // Estado para tabs de liga (posiciones vs partidos)
  const [tabsLiga, setTabsLiga] = useState<
    Record<number, "posiciones" | "partidos">
  >({});

  // Estado para fecha seleccionada en cada torneo
  const [fechaSeleccionada, setFechaSeleccionada] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    const init = async () => {
      try {
        // 1) Usuario actual
        const meRes = await fetch("/api/seguridad/roles/logged", {
          cache: "no-store",
          credentials: "include",
        });
        if (!meRes.ok) throw new Error("No se pudo obtener usuario actual");
        const me = await meRes.json();

        // 2) Buscar idPersona en usuarios
        const usersRes = await fetch("/api/seguridad/usuarios", {
          cache: "no-store",
        });
        const users = await usersRes.json();
        const yo = users.find((u: any) => u.id === me.idUsuario);
        if (!yo?.idPersona) throw new Error("Usuario sin persona asignada");

        // 3) Buscar socio con ese idPersona
        const sociosRes = await fetch("/api/socios", { cache: "no-store" });
        const socios = await sociosRes.json();
        const socio = socios.find((s: any) => s.IdPersona === yo.idPersona);
        if (!socio) throw new Error("No se encontró socio");

        // 4) Guardar socioId real
        const socioIdReal = socio.IdSocio;
        setSocioIdState(socioIdReal);
        setInscripciones({}); // limpiar inscripciones previas

        // 5) Cargar datos iniciales
        await fetchTorneos(socioIdReal);
        await fetchEquipos(socioIdReal);
        await fetchDeportes();
      } catch (err) {
        console.error("Error inicializando torneos:", err);
        toast({
          title: "Error",
          description: "No se pudieron cargar los torneos.",
          variant: "destructive",
        });
        router.push("/socio-dashboard");
      }
    };

    init();
  }, [router, toast]);

  const fetchTorneos = async (socioIdParam?: number) => {
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
      const sid = socioIdParam ?? socioIdState ?? null;
      if (sid) {
        for (const torneo of data) {
          await checkInscripcion(torneo.IdTorneo, sid);
        }
      }
    } catch (error: any) {
      console.error("Error fetching torneos:", error);
      setError(`Error al cargar torneos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipos = async (socioIdParam?: number) => {
    try {
      const sid = socioIdParam ?? socioIdState;
      if (!sid) return;
      const response = await fetch(`/api/equipos?socioId=${sid}`);
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
        // Ordenar por FechaHora ascendente
        const partidosOrdenados = partidosData.sort(
          (a: Partido, b: Partido) => {
            if (!a.FechaHora) return 1;
            if (!b.FechaHora) return -1;
            return a.FechaHora.localeCompare(b.FechaHora);
          }
        );
        setPartidosPorTorneo((prev) => ({
          ...prev,
          [torneoId]: partidosOrdenados,
        }));

        // Auto-seleccionar primera fecha con partidos pendientes (para Ligas)
        const fechas = obtenerFechasUnicas(partidosOrdenados);
        const fechaConPendientes = fechas.find((fecha) =>
          partidosOrdenados.some((p: Partido) => {
            const match = p.FixtureNombre.match(/Fecha (\d+)/);
            return match && parseInt(match[1]) === fecha && p.Estado !== 2;
          })
        );
        setFechaSeleccionada((prev) => ({
          ...prev,
          [torneoId]: fechaConPendientes || fechas[0] || 1,
        }));
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
      // Inicializar tab en "posiciones" si es liga
      if (!tabsLiga[torneoId]) {
        setTabsLiga((prev) => ({ ...prev, [torneoId]: "posiciones" }));
      }
    }
  };

  // Obtener fechas únicas de los partidos (extrae número de "Fecha X")
  const obtenerFechasUnicas = (partidos: Partido[]): number[] => {
    const fechas = new Set<number>();
    partidos.forEach((p) => {
      const match = p.FixtureNombre.match(/Fecha (\d+)/);
      if (match) {
        fechas.add(parseInt(match[1]));
      }
    });
    return Array.from(fechas).sort((a, b) => a - b);
  };

  // Calcular tabla de posiciones para torneos tipo Liga
  const calcularTablaPosiciones = (
    torneoId: number
  ): {
    participante: string;
    pj: number;
    pg: number;
    pe: number;
    pp: number;
    puntos: number;
  }[] => {
    const partidos = partidosPorTorneo[torneoId] || [];
    const participantes = participantesPorTorneo[torneoId] || [];

    // Inicializar stats para cada participante
    const stats: Record<
      string,
      { pj: number; pg: number; pe: number; pp: number; puntos: number }
    > = {};

    participantes.forEach((p) => {
      stats[p.nombre] = { pj: 0, pg: 0, pe: 0, pp: 0, puntos: 0 };
    });

    // Procesar partidos finalizados (Estado === 2)
    partidos
      .filter((p) => p.Estado === 2)
      .forEach((partido) => {
        const pA = partido.ParticipanteA;
        const pB = partido.ParticipanteB;

        if (!pA || !pB || !stats[pA] || !stats[pB]) return;

        // Incrementar partidos jugados
        stats[pA].pj++;
        stats[pB].pj++;

        // Determinar ganador (simplificado: si hay resultado, el primero gana)
        // En tu caso real deberías tener un campo de resultado o puntaje
        const ganadorA = Math.random() > 0.5; // Placeholder

        if (ganadorA) {
          stats[pA].pg++;
          stats[pA].puntos += 3;
          stats[pB].pp++;
        } else {
          stats[pB].pg++;
          stats[pB].puntos += 3;
          stats[pA].pp++;
        }
      });

    // Convertir a array y ordenar por puntos
    return Object.entries(stats)
      .map(([participante, data]) => ({
        participante,
        ...data,
      }))
      .sort((a, b) => b.puntos - a.puntos);
  };

  const checkInscripcion = async (torneoId: number, socioId?: number) => {
    try {
      const sid = socioId ?? socioIdState;
      if (!sid) return;
      const response = await fetch(
        `/api/torneos/${torneoId}/mi-inscripcion?socioId=${sid}`
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
    if (!socioIdState) {
      toast({
        title: "Error",
        description: "No se encontró el socio para inscribir.",
        variant: "destructive",
      });
      return;
    }
    setProcesando(torneoId);
    try {
      const response = await fetch(`/api/torneos/${torneoId}/inscribir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          socioId: socioIdState,
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
        await checkInscripcion(torneoId, socioIdState);
        await fetchTorneos(socioIdState); // Actualizar contador de participantes
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
    if (!socioIdState) {
      toast({
        title: "Error",
        description: "No se encontró el socio para desinscribir.",
        variant: "destructive",
      });
      return;
    }
    setProcesando(torneoId);
    try {
      const response = await fetch(`/api/torneos/${torneoId}/desinscribir`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ socioId: socioIdState }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Desinscripción exitosa",
          description: data.message,
        });
        await checkInscripcion(torneoId, socioIdState);
        await fetchTorneos(socioIdState); // Actualizar contador de participantes
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
      torneo.NombreDeporte?.toLowerCase().includes(d.toLowerCase())
    );
    const esEquipo = DEPORTES_EQUIPOS.some((d) =>
      torneo.NombreDeporte?.toLowerCase().includes(d.toLowerCase())
    );

    const deporteLower = torneo.NombreDeporte?.toLowerCase() || "";
    const permiteIndividual = esIndividual;
    const permiteEquipos = esEquipo;

    const equiposCompatibles = equipos.filter(
      (equipo) => equipo.NombreDeporte?.toLowerCase() === deporteLower
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

  const filteredTorneos = torneos
    .filter((torneo) => {
      // Excluir torneos cancelados en los que NO estoy inscrito
      const inscripcionStatus = inscripciones[torneo.IdTorneo];
      const estaInscrito = inscripcionStatus?.inscrito || false;

      if (torneo.Estado === 3 && !estaInscrito && filtros.estado !== "3") {
        return false;
      }

      // Filtros actuales (búsqueda, estado, deporte, tipoParticipacion)
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

      if (
        filtros.estado &&
        filtros.estado !== "all" &&
        torneo.Estado.toString() !== filtros.estado
      ) {
        return false;
      }

      if (
        filtros.deporte &&
        filtros.deporte !== "all" &&
        torneo.NombreDeporte !== filtros.deporte
      ) {
        return false;
      }

      if (filtros.tipoParticipacion && filtros.tipoParticipacion !== "all") {
        const tipoTorneo = getTipoParticipacion(torneo.NombreDeporte);
        if (
          filtros.tipoParticipacion !== "ambos" &&
          tipoTorneo !== filtros.tipoParticipacion &&
          tipoTorneo !== "ambos"
        ) {
          return false;
        }
      }

      return true;
    })
    // 🔎 Reordenar torneos
    .sort((a, b) => {
      const inscA = inscripciones[a.IdTorneo]?.inscrito || false;
      const inscB = inscripciones[b.IdTorneo]?.inscrito || false;

      // 🥇 Inscritos primero dentro de cada estado
      if (inscA && !inscB) return -1;
      if (!inscA && inscB) return 1;

      // ⚡ Orden de estados: Activo (1) → Pendiente (0) → Finalizado (2) → Cancelado (3)
      const estadoOrder: { [key: number]: number } = { 1: 0, 0: 1, 2: 2, 3: 3 };
      if (estadoOrder[a.Estado] !== estadoOrder[b.Estado]) {
        return estadoOrder[a.Estado] - estadoOrder[b.Estado];
      }

      // ⏱️ Dentro del mismo estado → ordenar por fecha de inicio ascendente
      return (
        new Date(a.FechaInicio).getTime() - new Date(b.FechaInicio).getTime()
      );
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
            <Button onClick={() => fetchTorneos()}>Reintentar</Button>
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
                              {torneo.NombreDeporte
                                ? torneo.NombreDeporte
                                : "Deporte no especificado"}
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
                        {getTipoDeporteBadge(torneo.NombreDeporte)}
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
                            {torneoDetalle?.NombreDeporte ||
                              torneo.NombreDeporte ||
                              "Deporte no especificado"}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
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
                            {/* Si es torneo de eliminación (bracket), mostrar en modo especial */}
                            {torneosDetalle[torneo.IdTorneo]?.TipoTorneo ===
                            1 ? (
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
                                            {Number(participante.esEquipo) ===
                                              1 && participante.equipoId ? (
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
                                            ) : (
                                              <Badge
                                                variant="outline"
                                                className="flex items-center gap-1 px-3 py-1"
                                              >
                                                {getParticipanteIcon(
                                                  participante
                                                )}
                                                <span>
                                                  {participante.nombre}
                                                </span>
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
                                      {partidosPorTorneo[torneo.IdTorneo]
                                        ?.length || 0}{" "}
                                      partidos)
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    {!partidosPorTorneo[torneo.IdTorneo] ||
                                    partidosPorTorneo[torneo.IdTorneo]
                                      .length === 0 ? (
                                      <div className="text-center py-8">
                                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500">
                                          No se han generado partidos todavía
                                        </p>
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
                            ) : torneosDetalle[torneo.IdTorneo]?.TipoTorneo ===
                              0 ? (
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
                                            {Number(participante.esEquipo) ===
                                              1 && participante.equipoId ? (
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
                                            ) : (
                                              <Badge
                                                variant="outline"
                                                className="flex items-center gap-1 px-3 py-1"
                                              >
                                                {getParticipanteIcon(
                                                  participante
                                                )}
                                                <span>
                                                  {participante.nombre}
                                                </span>
                                              </Badge>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>

                                <Tabs
                                  value={
                                    tabsLiga[torneo.IdTorneo] || "posiciones"
                                  }
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
                                            <p className="text-gray-500">
                                              No se han generado partidos
                                              todavía
                                            </p>
                                          </div>
                                        ) : (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="w-12">
                                                  #
                                                </TableHead>
                                                <TableHead>
                                                  Participante
                                                </TableHead>
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
                                                <TableRow
                                                  key={fila.participante}
                                                >
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
                                                  setFechaSeleccionada(
                                                    (prev) => ({
                                                      ...prev,
                                                      [torneo.IdTorneo]:
                                                        parseInt(value),
                                                    })
                                                  )
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
                                            <p className="text-gray-500">
                                              No se han generado partidos
                                              todavía
                                            </p>
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
                                                  </div>
                                                  <div className="text-center">
                                                    <div className="font-medium">
                                                      {partido.ParticipanteA} vs{" "}
                                                      {partido.ParticipanteB}
                                                    </div>
                                                    <div className="text-sm text-gray-600 flex items-center justify-center gap-2 mt-1">
                                                      <Clock className="h-3 w-3" />
                                                      {partido.FechaHora ? (
                                                        <>
                                                          {format(
                                                            new Date(
                                                              partido.FechaHora
                                                            ),
                                                            "dd/MM/yyyy"
                                                          )}{" "}
                                                          -{" "}
                                                          {format(
                                                            new Date(
                                                              partido.FechaHora
                                                            ),
                                                            "HH:mm"
                                                          )}
                                                        </>
                                                      ) : (
                                                        "Próximamente"
                                                      )}
                                                    </div>
                                                    {partido.ArbitroNombre && (
                                                      <div className="text-xs text-gray-500 mt-1">
                                                        Árbitro:{" "}
                                                        {partido.ArbitroNombre}
                                                      </div>
                                                    )}
                                                  </div>
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
                              // Layout normal en grid para otros tipos de torneo
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
                                              {getParticipanteIcon(
                                                participante
                                              )}
                                              <span>{participante.nombre}</span>
                                              <Badge>{participante.tipo}</Badge>
                                            </div>

                                            {Number(participante.esEquipo) ===
                                              1 &&
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
                                                          forman parte del
                                                          equipo{" "}
                                                          {participante.nombre}
                                                        </DialogDescription>
                                                      </DialogHeader>

                                                      <div className="mt-2 space-y-1">
                                                        {integrantesEquipos[
                                                          participante.equipoId
                                                        ]?.length > 0 ? (
                                                          integrantesEquipos[
                                                            participante
                                                              .equipoId
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
                                                            No hay integrantes
                                                            en este equipo
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
                                      {torneo.TipoTorneo === 1 && (
                                        <Badge
                                          variant="outline"
                                          className="ml-2"
                                        >
                                          Bracket
                                        </Badge>
                                      )}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    {!partidosPorTorneo[torneo.IdTorneo] ||
                                    partidosPorTorneo[torneo.IdTorneo]
                                      .length === 0 ? (
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
                                                  {partido.ParticipanteA} vs{" "}
                                                  {partido.ParticipanteB}
                                                </div>
                                                <div className="text-sm text-gray-600 flex items-center justify-center gap-2 mt-1">
                                                  <Clock className="h-3 w-3" />
                                                  {partido.FechaHora ? (
                                                    <>
                                                      {format(
                                                        new Date(
                                                          partido.FechaHora
                                                        ),
                                                        "dd/MM/yyyy"
                                                      )}{" "}
                                                      -{" "}
                                                      {format(
                                                        new Date(
                                                          partido.FechaHora
                                                        ),
                                                        "HH:mm"
                                                      )}
                                                    </>
                                                  ) : (
                                                    "Próximamente"
                                                  )}
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
                            )}
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
