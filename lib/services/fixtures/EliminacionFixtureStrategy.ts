/**
 * Estrategia para torneos de Eliminación Directa (Bracket/Copa)
 * Los perdedores son eliminados inmediatamente del torneo
 */

import type { IFixtureStrategy } from "./IFixtureStrategy";
import type {
  GenerarFixtureParams,
  FixtureGenerado,
  Participante,
  Fixture,
  Partido,
  ValidacionResult,
  TipoTorneo,
} from "./types";

export class EliminacionFixtureStrategy implements IFixtureStrategy {
  /**
   * Verifica si un número es potencia de 2
   */
  private esPotenciaDe2(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  /**
   * Calcula la siguiente potencia de 2 mayor o igual a n
   */
  private siguientePotenciaDe2(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  validarParticipantes(participantes: Participante[]): ValidacionResult {
    if (participantes.length < 2) {
      return {
        valido: false,
        mensaje:
          "Se necesitan al menos 2 participantes para eliminación directa",
      };
    }

    if (participantes.length > 64) {
      return {
        valido: false,
        mensaje:
          "Se recomienda máximo 64 participantes para eliminación directa",
      };
    }

    // Advertencia si no es potencia de 2 (igual es válido)
    if (!this.esPotenciaDe2(participantes.length)) {
      const siguiente = this.siguientePotenciaDe2(participantes.length);
      const byes = siguiente - participantes.length;
      return {
        valido: true,
        mensaje: `Se generarán ${byes} BYE${
          byes > 1 ? "s" : ""
        } para completar ${siguiente} participantes (bracket balanceado)`,
      };
    }

    return {
      valido: true,
      mensaje: `Bracket balanceado con ${participantes.length} participantes`,
    };
  }

  generarFixtures(params: GenerarFixtureParams): FixtureGenerado {
    const { torneoId, participantes } = params;
    const fixtures: Fixture[] = [];
    const partidos: Partido[] = [];

    // Calcular tamaño del bracket (siguiente potencia de 2)
    const numParticipantesTotal = this.siguientePotenciaDe2(
      participantes.length
    );
    const numRondas = Math.log2(numParticipantesTotal);

    // Obtener nombres de las fases
    const fasesNombres = this.obtenerNombresFases(numRondas);

    // Crear un fixture por cada fase
    fasesNombres.forEach((nombreFase, index) => {
      fixtures.push({
        Tipo: 1, // Eliminación
        TorneoId: torneoId,
        Nombre: nombreFase,
        NumeroRonda: index + 1,
        Grupo: null,
        FechaInicio: null,
        FechaFin: null,
      });
    });

    // Preparar participantes con BYEs
    const participantesConByes: (Participante | null)[] = [...participantes];

    // Agregar BYEs hasta completar potencia de 2
    while (participantesConByes.length < numParticipantesTotal) {
      participantesConByes.push(null); // null representa BYE
    }

    // Distribuir BYEs estratégicamente (distribuidos uniformemente en el bracket)
    const participantesDistribuidos =
      this.distribuirParticipantes(participantesConByes);

    // Generar TODOS los partidos de TODAS las rondas
    let partidosPorRonda = numParticipantesTotal / 2; // Primera ronda

    for (let ronda = 0; ronda < numRondas; ronda++) {
      // Para la primera ronda, asignar participantes reales
      if (ronda === 0) {
        for (let i = 0; i < participantesDistribuidos.length; i += 2) {
          const pA = participantesDistribuidos[i];
          const pB = participantesDistribuidos[i + 1];

          // Si ambos son BYE, no crear partido
          if (pA === null && pB === null) {
            continue;
          }

          // Si uno es BYE, el otro avanza automáticamente
          partidos.push({
            ParticipanteAId: pA?.IdParticipante ?? null,
            ParticipanteBId: pB?.IdParticipante ?? null,
            FixtureId: ronda, // Índice temporal de la ronda
            FechaHora: null,
            Lugar:
              pA === null || pB === null
                ? "BYE - Pasa automáticamente"
                : "Por definir",
            ArbitroId: null,
            Estado: pA === null || pB === null ? 3 : 0, // 3 = Finalizado si hay BYE
            EstadoPartido: pA === null || pB === null ? "BYE" : "Programado",
          });
        }
      } else {
        // Para rondas siguientes, crear partidos con participantes TBD (NULL)
        const partidosEnRonda = Math.pow(2, numRondas - ronda - 1);

        for (let i = 0; i < partidosEnRonda; i++) {
          partidos.push({
            ParticipanteAId: null, // TBD - Se definirá cuando termine el partido anterior
            ParticipanteBId: null, // TBD - Se definirá cuando termine el partido anterior
            FixtureId: ronda, // Índice temporal de la ronda
            FechaHora: null,
            Lugar: "Por definir",
            ArbitroId: null,
            Estado: 0, // Programado
            EstadoPartido: "Por Definir",
          });
        }
      }
    }

    const totalPartidosGenerados = partidos.length;
    const partidosPrimeraRonda = partidos.filter(
      (p) => p.FixtureId === 0
    ).length;

    return {
      fixtures,
      partidos,
      metadata: {
        totalFixtures: fixtures.length,
        totalPartidos: totalPartidosGenerados,
        tipoTorneo: 1 as TipoTorneo,
        validaciones: [
          `${participantes.length} participantes reales`,
          `${numParticipantesTotal} con BYEs incluidos`,
          `${fasesNombres.length} fase${
            fasesNombres.length > 1 ? "s" : ""
          } (${fasesNombres.join(", ")})`,
          `${partidosPrimeraRonda} partidos en primera ronda`,
          `${totalPartidosGenerados} partidos totales creados (incluyendo rondas futuras con TBD)`,
          `Las rondas siguientes tienen participantes TBD que se definirán según resultados`,
        ],
      },
    };
  }

  /**
   * Distribuye participantes y BYEs de forma estratégica en el bracket
   * Los BYEs se distribuyen uniformemente para evitar concentración
   */
  private distribuirParticipantes(
    participantes: (Participante | null)[]
  ): (Participante | null)[] {
    const reales = participantes.filter((p) => p !== null);
    const numByes = participantes.length - reales.length;

    if (numByes === 0) {
      return participantes; // Ya está balanceado
    }

    // Distribuir uniformemente
    const distribuidos: (Participante | null)[] = [];
    const paso = participantes.length / numByes;

    let indexReal = 0;
    let indexBye = 0;

    for (let i = 0; i < participantes.length; i++) {
      // Determinar si en esta posición va un BYE o un real
      if (indexBye < numByes && Math.floor(indexBye * paso) <= i) {
        distribuidos.push(null);
        indexBye++;
      } else if (indexReal < reales.length) {
        distribuidos.push(reales[indexReal]);
        indexReal++;
      }
    }

    return distribuidos;
  }

  /**
   * Genera nombres descriptivos para cada fase del torneo
   */
  private obtenerNombresFases(numRondas: number): string[] {
    const nombres: string[] = [];
    const fases = [
      "Final",
      "Semifinal",
      "Cuartos de Final",
      "Octavos de Final",
      "Dieciseisavos de Final",
    ];

    for (let i = 0; i < numRondas; i++) {
      const rondaDesdeElFinal = numRondas - i - 1;

      if (rondaDesdeElFinal < fases.length) {
        nombres.push(fases[rondaDesdeElFinal]);
      } else {
        nombres.push(`Ronda ${i + 1}`);
      }
    }

    return nombres;
  }

  calcularNumeroPartidos(numParticipantes: number): number {
    // En eliminación directa: siempre n - 1 partidos totales
    // (cada partido elimina a un participante, quedan n-1 eliminados y 1 campeón)
    return numParticipantes - 1;
  }

  getInfo() {
    return {
      tipo: 1 as TipoTorneo,
      nombre: "Eliminación Directa",
      descripcion:
        "Sistema de bracket donde el perdedor queda eliminado. Ideal para 2, 4, 8, 16, 32 participantes.",
      minParticipantes: 2,
      requierePotenciaDe2: true,
    };
  }
}
