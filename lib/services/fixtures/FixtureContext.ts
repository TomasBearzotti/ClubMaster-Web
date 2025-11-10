/**
 * Contexto del patrón Strategy
 * Actúa como Factory para crear la estrategia correcta según el tipo de torneo
 * y delega las operaciones a la estrategia seleccionada
 */

import { LigaFixtureStrategy } from "./LigaFixtureStrategy";
import { EliminacionFixtureStrategy } from "./EliminacionFixtureStrategy";
import { GruposFixtureStrategy } from "./GruposFixtureStrategy";
import type { IFixtureStrategy } from "./IFixtureStrategy";
import type { TipoTorneo, GenerarFixtureParams, Participante } from "./types";

export class FixtureContext {
  private strategy: IFixtureStrategy;

  constructor(tipoTorneo: TipoTorneo) {
    this.strategy = this.crearEstrategia(tipoTorneo);
  }

  /**
   * Factory Method: Crea la estrategia correspondiente al tipo de torneo
   */
  private crearEstrategia(tipo: TipoTorneo): IFixtureStrategy {
    switch (tipo) {
      case 0: // LIGA
        return new LigaFixtureStrategy();
      case 1: // ELIMINACION
        return new EliminacionFixtureStrategy();
      case 2: // GRUPOS_ELIMINACION
        return new GruposFixtureStrategy();
      default:
        throw new Error(
          `Tipo de torneo no soportado: ${tipo}. Valores válidos: 0 (Liga), 1 (Eliminación), 2 (Grupos+Eliminación)`
        );
    }
  }

  /**
   * Permite cambiar la estrategia dinámicamente
   */
  cambiarEstrategia(tipoTorneo: TipoTorneo): void {
    this.strategy = this.crearEstrategia(tipoTorneo);
  }

  /**
   * Delega la validación a la estrategia actual
   */
  validarParticipantes(participantes: Participante[]) {
    return this.strategy.validarParticipantes(participantes);
  }

  /**
   * Delega la generación de fixtures a la estrategia actual
   */
  generarFixtures(params: GenerarFixtureParams) {
    return this.strategy.generarFixtures(params);
  }

  /**
   * Delega el cálculo de partidos a la estrategia actual
   */
  calcularNumeroPartidos(numParticipantes: number) {
    return this.strategy.calcularNumeroPartidos(numParticipantes);
  }

  /**
   * Obtiene información sobre la estrategia actual
   */
  getInfo() {
    return this.strategy.getInfo();
  }

  /**
   * Obtiene la estrategia actual (útil para testing)
   */
  getStrategy(): IFixtureStrategy {
    return this.strategy;
  }
}

/**
 * Helper function para crear rápidamente un contexto
 */
export function crearGeneradorFixture(tipoTorneo: TipoTorneo): FixtureContext {
  return new FixtureContext(tipoTorneo);
}
