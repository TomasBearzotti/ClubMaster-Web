/**
 * Interface base para todas las estrategias de generación de fixtures
 * Implementa el patrón Strategy Design Pattern
 */

import type {
  GenerarFixtureParams,
  FixtureGenerado,
  Participante,
  ValidacionResult,
  TipoTorneo,
} from "./types";

export interface IFixtureStrategy {
  /**
   * Valida que los participantes cumplan los requisitos del tipo de torneo
   * @param participantes - Array de participantes a validar
   * @returns Objeto con resultado de validación y mensaje explicativo
   */
  validarParticipantes(participantes: Participante[]): ValidacionResult;

  /**
   * Genera la estructura completa de fixtures y partidos
   * @param params - Parámetros necesarios para generar el fixture
   * @returns Estructura completa con fixtures, partidos y metadata
   */
  generarFixtures(params: GenerarFixtureParams): FixtureGenerado;

  /**
   * Calcula el número de partidos que se generarán
   * @param numParticipantes - Número de participantes del torneo
   * @returns Número total de partidos
   */
  calcularNumeroPartidos(numParticipantes: number): number;

  /**
   * Retorna información sobre el tipo de torneo
   * @returns Metadata del tipo de torneo
   */
  getInfo(): {
    tipo: TipoTorneo;
    nombre: string;
    descripcion: string;
    minParticipantes: number;
    requierePotenciaDe2: boolean;
  };
}
