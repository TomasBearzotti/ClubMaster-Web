/**
 * Estrategia para torneos con Fase de Grupos + Eliminación
 * Similar al formato de mundiales: primero grupos todos contra todos,
 * luego eliminación directa con los clasificados
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

export class GruposFixtureStrategy implements IFixtureStrategy {
  private readonly PARTICIPANTES_POR_GRUPO = 4;
  private readonly CLASIFICAN_POR_GRUPO = 2;

  validarParticipantes(participantes: Participante[]): ValidacionResult {
    if (participantes.length < 6) {
      return {
        valido: false,
        mensaje:
          "Se necesitan al menos 6 participantes para fase de grupos (mínimo 2 grupos)",
      };
    }

    const numGrupos = Math.ceil(
      participantes.length / this.PARTICIPANTES_POR_GRUPO
    );
    const clasificados = numGrupos * this.CLASIFICAN_POR_GRUPO;

    if (clasificados < 4) {
      return {
        valido: false,
        mensaje:
          "Se necesitan al menos 4 clasificados para la fase eliminatoria",
      };
    }

    return {
      valido: true,
      mensaje: `Se crearán ${numGrupos} grupos, ${clasificados} clasificados pasarán a eliminación`,
    };
  }

  generarFixtures(params: GenerarFixtureParams): FixtureGenerado {
    const { torneoId, participantes } = params;
    const fixtures: Fixture[] = [];
    const partidos: Partido[] = [];

    // Calcular número de grupos
    const numGrupos = Math.ceil(
      participantes.length / this.PARTICIPANTES_POR_GRUPO
    );

    // FASE 1: Fase de Grupos
    for (let g = 0; g < numGrupos; g++) {
      const nombreGrupo = String.fromCharCode(65 + g); // A, B, C, D...

      fixtures.push({
        Tipo: 2, // Grupos + Eliminación
        TorneoId: torneoId,
        Nombre: `Fase de Grupos - Grupo ${nombreGrupo}`,
        NumeroRonda: 1,
        Grupo: nombreGrupo,
        FechaInicio: null,
        FechaFin: null,
      });

      // Obtener participantes del grupo
      const inicio = g * this.PARTICIPANTES_POR_GRUPO;
      const fin = Math.min(
        inicio + this.PARTICIPANTES_POR_GRUPO,
        participantes.length
      );
      const participantesGrupo = participantes.slice(inicio, fin);

      // Generar partidos dentro del grupo (todos contra todos)
      for (let i = 0; i < participantesGrupo.length; i++) {
        for (let j = i + 1; j < participantesGrupo.length; j++) {
          partidos.push({
            ParticipanteAId: participantesGrupo[i].IdParticipante,
            ParticipanteBId: participantesGrupo[j].IdParticipante,
            FixtureId: g, // Índice temporal (fixture del grupo)
            FechaHora: null,
            Lugar: "Por definir",
            ArbitroId: null,
            Estado: 0,
            EstadoPartido: "Programado",
          });
        }
      }
    }

    // FASE 2: Fase Eliminatoria (fixtures placeholders)
    const clasificados = numGrupos * this.CLASIFICAN_POR_GRUPO;
    const numRondasEliminatorias = Math.ceil(Math.log2(clasificados));

    for (let fase = 0; fase < numRondasEliminatorias; fase++) {
      fixtures.push({
        Tipo: 2,
        TorneoId: torneoId,
        Nombre: this.obtenerNombreFaseEliminatoria(
          fase,
          numRondasEliminatorias
        ),
        NumeroRonda: 2 + fase, // Empieza después de la fase de grupos
        Grupo: null,
        FechaInicio: null,
        FechaFin: null,
      });
    }

    // Calcular estadísticas
    const partidosEliminatoriosEstimados = clasificados - 1;
    const totalPartidosEstimados =
      partidos.length + partidosEliminatoriosEstimados;

    return {
      fixtures,
      partidos,
      metadata: {
        totalFixtures: fixtures.length,
        totalPartidos: partidos.length, // Solo partidos de grupos por ahora
        tipoTorneo: 2 as TipoTorneo,
        validaciones: [
          `${participantes.length} participantes totales`,
          `${numGrupos} grupos de ~${this.PARTICIPANTES_POR_GRUPO} participantes`,
          `${partidos.length} partidos en fase de grupos`,
          `${clasificados} clasificarán a fase eliminatoria`,
          `~${partidosEliminatoriosEstimados} partidos en fase eliminatoria (a generar)`,
          `~${totalPartidosEstimados} partidos totales estimados`,
          `Los partidos de eliminación se generarán cuando finalice la fase de grupos`,
        ],
      },
    };
  }

  /**
   * Genera nombres descriptivos para cada fase eliminatoria
   */
  private obtenerNombreFaseEliminatoria(index: number, total: number): string {
    const fases = [
      "Final",
      "Semifinal",
      "Cuartos de Final",
      "Octavos de Final",
    ];

    const posicionDesdeElFinal = total - index - 1;

    if (posicionDesdeElFinal < fases.length) {
      return fases[posicionDesdeElFinal];
    }

    return `Fase Eliminatoria - Ronda ${index + 1}`;
  }

  calcularNumeroPartidos(numParticipantes: number): number {
    const numGrupos = Math.ceil(
      numParticipantes / this.PARTICIPANTES_POR_GRUPO
    );

    // Partidos en fase de grupos
    let partidosGrupos = 0;
    for (let g = 0; g < numGrupos; g++) {
      const inicio = g * this.PARTICIPANTES_POR_GRUPO;
      const fin = Math.min(
        inicio + this.PARTICIPANTES_POR_GRUPO,
        numParticipantes
      );
      const tamañoGrupo = fin - inicio;

      // Combinatoria C(n,2) = n*(n-1)/2
      partidosGrupos += (tamañoGrupo * (tamañoGrupo - 1)) / 2;
    }

    // Partidos en fase eliminatoria
    const clasificados = numGrupos * this.CLASIFICAN_POR_GRUPO;
    const partidosEliminatorios = clasificados - 1;

    return partidosGrupos + partidosEliminatorios;
  }

  getInfo() {
    return {
      tipo: 2 as TipoTorneo,
      nombre: "Fase de Grupos + Eliminación",
      descripcion:
        "Primero grupos todos contra todos, luego eliminación directa con los mejores clasificados de cada grupo.",
      minParticipantes: 6,
      requierePotenciaDe2: false,
    };
  }
}
