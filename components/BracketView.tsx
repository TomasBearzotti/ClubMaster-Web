"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Eye, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface Partido {
  IdPartido: number;
  ParticipanteAId?: number;
  ParticipanteBId?: number;
  ParticipanteA: string | null;
  ParticipanteB: string | null;
  FechaHora?: string;
  FixtureNombre: string;
  NumeroRonda?: number;
  Estado: number;
  Lugar?: string;
  // Campos de resultado
  GanadorId?: number;
  EsEmpate?: boolean;
  TieneResultado?: boolean;
}

interface BracketViewProps {
  partidos: Partido[];
}

export function BracketView({ partidos }: BracketViewProps) {
  const router = useRouter();

  const partidosPorRonda = React.useMemo(() => {
    const agrupados: { [ronda: number]: Partido[] } = {};
    partidos.forEach((partido) => {
      const ronda = partido.NumeroRonda || 1;
      if (!agrupados[ronda]) {
        agrupados[ronda] = [];
      }
      agrupados[ronda].push(partido);
    });
    return agrupados;
  }, [partidos]);

  const rondas = Object.keys(partidosPorRonda)
    .map(Number)
    .sort((a, b) => a - b);

  const handleVerPartido = (partidoId: number) => {
    router.push(`/partidos/${partidoId}`);
  };

  const getNombreRonda = (ronda: number, totalRondas: number) => {
    if (ronda === totalRondas) {
      return "Final";
    } else if (ronda === totalRondas - 1) {
      return "Semifinales";
    } else if (ronda === totalRondas - 2) {
      return "Cuartos de Final";
    } else if (ronda === totalRondas - 3) {
      return "Octavos de Final";
    } else {
      return `Ronda ${ronda}`;
    }
  };

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
            Programado
          </Badge>
        );
      case 1:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">
            En Curso
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
            Finalizado
          </Badge>
        );
      default:
        return null;
    }
  };

  if (rondas.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-lg">No hay partidos de eliminación</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-4">
      <div className="flex gap-6 items-center justify-center w-full px-2">
        {rondas.map((ronda, indexRonda) => {
          const partidosRonda = partidosPorRonda[ronda];
          const espacioVertical = indexRonda === 0 ? 8 : indexRonda * 60;
            
          return (
            <div key={ronda} className="flex flex-col items-center flex-shrink-0">
              <div className="mb-2 text-center">
                <h3 className="font-bold text-sm text-blue-900 flex items-center justify-center gap-1">
                  {indexRonda === rondas.length - 1 && (
                    <Trophy className="h-3 w-3 text-yellow-600" />
                  )}
                  {getNombreRonda(ronda, rondas.length)}
                </h3>
                <p className="text-xs text-gray-500">
                  {partidosRonda.length} {partidosRonda.length === 1 ? 'partido' : 'partidos'}
                </p>
              </div>

              <div className="flex flex-col" style={{ gap: `${espacioVertical}px` }}>
                {partidosRonda.map((partido, index) => (
                  <div key={partido.IdPartido} style={{ width: "240px" }}>
                    <PartidoCard
                      partido={partido}
                      onVerPartido={handleVerPartido}
                      getEstadoBadge={getEstadoBadge}
                      indexRonda={indexRonda}
                      index={index}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex items-center justify-center gap-6 flex-wrap text-sm text-gray-600 border-t border-gray-200 pt-6 w-full max-w-3xl">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>Programado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span>En Curso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Finalizado</span>
        </div>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">TBD = Por Definir</span>
        </div>
      </div>
    </div>
  );
}

// Componente para cada card de partido
interface PartidoCardProps {
  partido: Partido;
  onVerPartido: (id: number) => void;
  getEstadoBadge: (estado: number) => React.ReactNode;
  indexRonda: number;
  index: number;
}

function PartidoCard({
  partido,
  onVerPartido,
  getEstadoBadge,
  indexRonda,
  index,
}: PartidoCardProps) {
  const hasTBD = !partido.ParticipanteA || !partido.ParticipanteB;
  const [revealed, setRevealed] = React.useState(false);
  const [resultados, setResultados] = React.useState<{
    scoreA: number | null;
    scoreB: number | null;
  }>({ scoreA: null, scoreB: null });

  React.useEffect(() => {
    if (partido.TieneResultado && partido.IdPartido) {
      fetch(`/api/estadisticas/${partido.IdPartido}`)
        .then((res) => res.json())
        .then((estadisticas) => {
          if (estadisticas.length > 0) {
            const primerCampo = estadisticas[0]?.NombreCampo;
            const scoreA = estadisticas.find(
              (s: any) =>
                s.ParticipanteId === partido.ParticipanteAId &&
                s.NombreCampo === primerCampo
            );
            const scoreB = estadisticas.find(
              (s: any) =>
                s.ParticipanteId === partido.ParticipanteBId &&
                s.NombreCampo === primerCampo
            );
            setResultados({
              scoreA: scoreA ? Number(scoreA.Valor) : null,
              scoreB: scoreB ? Number(scoreB.Valor) : null,
            });
          }
        })
        .catch((err) => console.error("Error fetching stats:", err));
    }
  }, [
    partido.IdPartido,
    partido.TieneResultado,
    partido.ParticipanteAId,
    partido.ParticipanteBId,
  ]);

  return (
    <Card
      className={`border-2 transition-all hover:shadow-md relative ${
        hasTBD
          ? "border-dashed border-gray-300 bg-gray-50/50"
          : "hover:border-blue-300 border-gray-200"
      }`}
    >
      <CardContent className="p-3">
        {!hasTBD && (
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-blue-100"
              onClick={() => onVerPartido(partido.IdPartido)}
              title="Ver detalle del partido"
            >
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>
          </div>
        )}

        {hasTBD && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">
              Por Definir
            </Badge>
          </div>
        )}

        {partido.FechaHora && !hasTBD && (
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(partido.FechaHora), "dd/MM HH:mm")}
          </div>
        )}

        <div className="space-y-2">
          <div
            className={`flex items-center justify-between p-2 rounded border transition-all ${
              !partido.ParticipanteA
                ? "bg-gray-100 border-gray-300 border-dashed"
                : revealed && partido.TieneResultado && !partido.EsEmpate
                ? partido.GanadorId === partido.ParticipanteAId
                  ? "bg-green-50 border-green-300"
                  : "bg-gray-50 border-gray-300"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {revealed &&
                partido.TieneResultado &&
                !partido.EsEmpate &&
                partido.GanadorId === partido.ParticipanteAId && (
                  <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                )}

              <span
                className={`text-sm truncate ${
                  !partido.ParticipanteA
                    ? "text-gray-400 italic font-normal"
                    : revealed && partido.TieneResultado && !partido.EsEmpate
                    ? partido.GanadorId === partido.ParticipanteAId
                      ? "font-bold text-green-600"
                      : "text-gray-400"
                    : "font-medium text-gray-900"
                }`}
              >
                {partido.ParticipanteA || "TBD"}
              </span>
            </div>

            {partido.TieneResultado && partido.ParticipanteA && (
              <button
                onClick={() => setRevealed(!revealed)}
                className={`ml-2 px-3 py-1 text-sm font-bold rounded hover:bg-gray-100 transition-colors cursor-pointer select-none min-w-[40px] text-center ${
                  revealed
                    ? partido.GanadorId === partido.ParticipanteAId
                      ? "text-green-600"
                      : partido.EsEmpate
                      ? "text-yellow-600"
                      : "text-gray-400"
                    : "text-gray-400"
                }`}
                title="Click para revelar/ocultar resultado"
              >
                {revealed
                  ? resultados.scoreA !== null
                    ? resultados.scoreA
                    : "?"
                  : "***"}
              </button>
            )}
          </div>

          {/* Participante B */}
          <div
            className={`flex items-center justify-between p-2 rounded border transition-all ${
              !partido.ParticipanteB
                ? "bg-gray-100 border-gray-300 border-dashed"
                : revealed && partido.TieneResultado && !partido.EsEmpate
                ? partido.GanadorId === partido.ParticipanteBId
                  ? "bg-green-50 border-green-300"
                  : "bg-gray-50 border-gray-300"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {revealed &&
                partido.TieneResultado &&
                !partido.EsEmpate &&
                partido.GanadorId === partido.ParticipanteBId && (
                  <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                )}

              <span
                className={`text-sm truncate ${
                  !partido.ParticipanteB
                    ? "text-gray-400 italic font-normal"
                    : revealed && partido.TieneResultado && !partido.EsEmpate
                    ? partido.GanadorId === partido.ParticipanteBId
                      ? "font-bold text-green-600"
                      : "text-gray-400"
                    : "font-medium text-gray-900"
                }`}
              >
                {partido.ParticipanteB || "TBD"}
              </span>
            </div>

            {partido.TieneResultado && partido.ParticipanteB && (
              <button
                onClick={() => setRevealed(!revealed)}
                className={`ml-2 px-3 py-1 text-sm font-bold rounded hover:bg-gray-100 transition-colors cursor-pointer select-none min-w-[40px] text-center ${
                  revealed
                    ? partido.GanadorId === partido.ParticipanteBId
                      ? "text-green-600"
                      : partido.EsEmpate
                      ? "text-yellow-600"
                      : "text-gray-400"
                    : "text-gray-400"
                }`}
                title="Click para revelar/ocultar resultado"
              >
                {revealed
                  ? resultados.scoreB !== null
                    ? resultados.scoreB
                    : "?"
                  : "***"}
              </button>
            )}
          </div>
        </div>

        {!hasTBD && (
          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              {getEstadoBadge(partido.Estado)}
              {revealed && partido.EsEmpate && (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
                  Empate
                </Badge>
              )}
            </div>
            {partido.Lugar && (
              <span className="text-xs text-gray-500 truncate">
                {partido.Lugar}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
