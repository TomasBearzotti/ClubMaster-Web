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
  ParticipanteA: string | null;
  ParticipanteB: string | null;
  FechaHora?: string;
  FixtureNombre: string;
  NumeroRonda?: number;
  Estado: number;
  Lugar?: string;
}

interface BracketViewProps {
  partidos: Partido[];
}

export function BracketView({ partidos }: BracketViewProps) {
  const router = useRouter();

  // Agrupar partidos por ronda
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

  const handleVerPartido = (partidoId: number) => {
    router.push(`/partidos/${partidoId}`);
  };

  const rondas = Object.keys(partidosPorRonda)
    .map(Number)
    .sort((a, b) => a - b);

  const getNombreRonda = (ronda: number, totalRondas: number) => {
    const partidosEnRonda = partidosPorRonda[ronda].length;

    // Determinar el nombre de la ronda basado en la cantidad de partidos
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

  // Dividir los partidos de la primera ronda en dos mitades (bracket split)
  const dividirPrimeraRonda = () => {
    const primeraRonda = rondas[0];
    const partidosPrimeraRonda = partidosPorRonda[primeraRonda];
    const mitad = Math.ceil(partidosPrimeraRonda.length / 2);

    return {
      mitadSuperior: partidosPrimeraRonda.slice(0, mitad),
      mitadInferior: partidosPrimeraRonda.slice(mitad),
    };
  };

  const { mitadSuperior, mitadInferior } = dividirPrimeraRonda();

  return (
    <div className="w-full">
      {/* Bracket dividido en dos mitades */}
      <div className="overflow-x-auto pb-4">
        {/* Mitad Superior */}
        <div className="mb-12">
          <div className="flex gap-8 min-w-max px-4">
            {rondas.map((ronda, indexRonda) => {
              const partidosRonda = partidosPorRonda[ronda];
              const partidosMostrar =
                indexRonda === 0
                  ? mitadSuperior
                  : indexRonda === rondas.length - 1
                  ? [partidosRonda[0]] // Solo la final
                  : partidosRonda.slice(0, Math.ceil(partidosRonda.length / 2));

              return (
                <div
                  key={`superior-${ronda}`}
                  className="flex flex-col"
                  style={{ minWidth: "280px" }}
                >
                  {/* Encabezado de la ronda */}
                  <div className="mb-4 text-center sticky top-0 bg-gradient-to-br from-blue-50 to-gray-100 py-2 z-10">
                    <h3 className="font-bold text-lg text-blue-900 flex items-center justify-center gap-2">
                      {indexRonda === rondas.length - 1 && (
                        <Trophy className="h-5 w-5 text-yellow-600" />
                      )}
                      {getNombreRonda(ronda, rondas.length)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {indexRonda === rondas.length - 1
                        ? "1 partido"
                        : `${partidosMostrar.length} partidos`}
                    </p>
                  </div>

                  {/* Partidos de la ronda */}
                  <div className="space-y-6 flex-1">
                    {partidosMostrar.map((partido, index) => (
                      <PartidoCard
                        key={partido.IdPartido}
                        partido={partido}
                        onVerPartido={handleVerPartido}
                        getEstadoBadge={getEstadoBadge}
                        indexRonda={indexRonda}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Línea separadora */}
        <div className="border-t-2 border-gray-300 my-8 mx-4"></div>

        {/* Mitad Inferior */}
        <div>
          <div className="flex gap-8 min-w-max px-4">
            {rondas.slice(0, -1).map((ronda, indexRonda) => {
              const partidosRonda = partidosPorRonda[ronda];
              const partidosMostrar =
                indexRonda === 0
                  ? mitadInferior
                  : partidosRonda.slice(Math.ceil(partidosRonda.length / 2));

              return (
                <div
                  key={`inferior-${ronda}`}
                  className="flex flex-col"
                  style={{ minWidth: "280px" }}
                >
                  {/* Encabezado de la ronda */}
                  <div className="mb-4 text-center sticky top-0 bg-gradient-to-br from-blue-50 to-gray-100 py-2 z-10">
                    <h3 className="font-bold text-lg text-blue-900">
                      {getNombreRonda(ronda, rondas.length)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {partidosMostrar.length} partidos
                    </p>
                  </div>

                  {/* Partidos de la ronda */}
                  <div className="space-y-6 flex-1">
                    {partidosMostrar.map((partido, index) => (
                      <PartidoCard
                        key={partido.IdPartido}
                        partido={partido}
                        onVerPartido={handleVerPartido}
                        getEstadoBadge={getEstadoBadge}
                        indexRonda={indexRonda}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-6 flex items-center justify-center gap-4 flex-wrap text-xs text-gray-600 px-4 border-t pt-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>Programado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span>En Curso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
          <span>Finalizado</span>
        </div>
        <div className="flex items-center gap-1">
          <HelpCircle className="h-3 w-3 text-gray-400" />
          <span className="text-gray-400">TBD = Por Definir</span>
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

  return (
    <Card
      className={`border-2 transition-all hover:shadow-md relative ${
        hasTBD
          ? "border-dashed border-gray-300 bg-gray-50/50"
          : "hover:border-blue-300 border-gray-200"
      }`}
      style={{
        marginTop:
          indexRonda > 0 && index > 0
            ? `${Math.pow(2, indexRonda) * 16}px`
            : "0",
      }}
    >
      <CardContent className="p-3">
        {/* Botón Ver Partido - Solo si no es TBD */}
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

        {/* Badge TBD si aplica */}
        {hasTBD && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">
              Por Definir
            </Badge>
          </div>
        )}

        {/* Fecha y hora */}
        {partido.FechaHora && !hasTBD && (
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(partido.FechaHora), "dd/MM HH:mm")}
          </div>
        )}

        {/* Participantes */}
        <div className="space-y-2">
          <div
            className={`flex items-center justify-between p-2 rounded border ${
              !partido.ParticipanteA
                ? "bg-gray-100 border-gray-300 border-dashed"
                : "bg-white border-gray-200"
            }`}
          >
            <span
              className={`text-sm truncate pr-2 ${
                !partido.ParticipanteA
                  ? "text-gray-400 italic font-normal"
                  : "font-medium text-gray-900"
              }`}
            >
              {partido.ParticipanteA || "TBD"}
            </span>
          </div>
          <div
            className={`flex items-center justify-between p-2 rounded border ${
              !partido.ParticipanteB
                ? "bg-gray-100 border-gray-300 border-dashed"
                : "bg-white border-gray-200"
            }`}
          >
            <span
              className={`text-sm truncate pr-2 ${
                !partido.ParticipanteB
                  ? "text-gray-400 italic font-normal"
                  : "font-medium text-gray-900"
              }`}
            >
              {partido.ParticipanteB || "TBD"}
            </span>
          </div>
        </div>

        {/* Estado y lugar */}
        {!hasTBD && (
          <div className="mt-2 flex items-center justify-between gap-2">
            {getEstadoBadge(partido.Estado)}
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
