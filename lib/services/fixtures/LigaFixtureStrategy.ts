/**
 * Estrategia para torneos tipo Liga (Todos contra Todos)
 * Implementa el algoritmo Round-Robin para distribución equitativa de partidos
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

export class LigaFixtureStrategy implements IFixtureStrategy {
  validarParticipantes(participantes: Participante[]): ValidacionResult {
    if (participantes.length < 3) {
      return {
        valido: false,
        mensaje: "Se necesitan al menos 3 participantes para una liga",
      };
    }

    if (participantes.length > 16) {
      return {
        valido: false,
        mensaje:
          "Se recomienda máximo 16 participantes para mantener el fixture manejable. Con más participantes, considere usar fase de grupos.",
      };
    }

    return {
      valido: true,
      mensaje: `Fixture válido para ${participantes.length} participantes`,
    };
  }

  generarFixtures(params: GenerarFixtureParams): FixtureGenerado {
    const { torneoId, participantes } = params;
    const fixtures: Fixture[] = [];
    const partidos: Partido[] = [];

    // Calcular número de fechas (rondas) necesarias
    const numFechas =
      participantes.length % 2 === 0
        ? participantes.length - 1
        : participantes.length;

    // Crear un fixture por cada fecha
    for (let fecha = 1; fecha <= numFechas; fecha++) {
      fixtures.push({
        Tipo: 0, // Liga
        TorneoId: torneoId,
        Nombre: `Fecha ${fecha}`,
        NumeroRonda: fecha,
        Grupo: null,
        FechaInicio: null,
        FechaFin: null,
      });
    }

    // Algoritmo Round-Robin para distribución de partidos
    const equipos = [...participantes];

    // Si hay número impar de participantes, agregar un "BYE"
    if (equipos.length % 2 !== 0) {
      equipos.push({
        IdParticipante: -1, // Marcador especial para BYE
        Nombre: "BYE",
        EsEquipo: false,
      } as Participante);
    }

    const numEquipos = equipos.length;

    // Generar partidos usando rotación de equipos
    for (let ronda = 0; ronda < numEquipos - 1; ronda++) {
      for (let i = 0; i < numEquipos / 2; i++) {
        const local = equipos[i];
        const visitante = equipos[numEquipos - 1 - i];

        // Solo crear partido si ninguno es BYE
        if (local.IdParticipante > 0 && visitante.IdParticipante > 0) {
          partidos.push({
            ParticipanteAId: local.IdParticipante,
            ParticipanteBId: visitante.IdParticipante,
            FixtureId: ronda, // Índice temporal, se reemplazará con ID real
            FechaHora: null,
            Lugar: "Por definir",
            ArbitroId: null,
            Estado: 0,
            EstadoPartido: "Programado",
          });
        }
      }

      // Rotar equipos (mantener el primero fijo, rotar el resto)
      const ultimo = equipos.pop()!;
      equipos.splice(1, 0, ultimo);
    }

    return {
      fixtures,
      partidos,
      metadata: {
        totalFixtures: fixtures.length,
        totalPartidos: partidos.length,
        tipoTorneo: 0 as TipoTorneo,
        validaciones: [
          `${participantes.length} participantes`,
          `${numFechas} fechas`,
          `${partidos.length} partidos totales`,
          `Cada equipo juega ${participantes.length - 1} partidos`,
          participantes.length % 2 !== 0
            ? "Incluye fechas de descanso (BYE)"
            : "Sin fechas de descanso",
        ],
      },
    };
  }

  calcularNumeroPartidos(numParticipantes: number): number {
    // Fórmula combinatoria: C(n,2) = n * (n-1) / 2
    return (numParticipantes * (numParticipantes - 1)) / 2;
  }

  getInfo() {
    return {
      tipo: 0 as TipoTorneo,
      nombre: "Liga (Todos contra Todos)",
      descripcion:
        "Cada participante juega contra todos los demás una vez. Se genera una tabla de posiciones.",
      minParticipantes: 3,
      requierePotenciaDe2: false,
    };
  }
}
