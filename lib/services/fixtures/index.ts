/**
 * Exportaciones públicas del sistema de fixtures
 * Patrón Strategy para generación de fixtures de torneos
 */

// Tipos y enums
export { TipoTorneo } from "./types";
export type {
  Participante,
  Fixture,
  Partido,
  GenerarFixtureParams,
  FixtureGenerado,
  ValidacionResult,
} from "./types";

// Interface Strategy
export type { IFixtureStrategy } from "./IFixtureStrategy";

// Estrategias concretas
export { LigaFixtureStrategy } from "./LigaFixtureStrategy";
export { EliminacionFixtureStrategy } from "./EliminacionFixtureStrategy";
export { GruposFixtureStrategy } from "./GruposFixtureStrategy";

// Contexto (principal punto de entrada)
export { FixtureContext, crearGeneradorFixture } from "./FixtureContext";
