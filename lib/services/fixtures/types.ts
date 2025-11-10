/**
 * Tipos y enums para el sistema de fixtures y torneos
 */

export enum TipoTorneo {
  LIGA = 0, // Todos contra Todos
  ELIMINACION = 1, // Eliminación Directa
  GRUPOS_ELIMINACION = 2, // Fase de Grupos + Eliminación
}

export interface Participante {
  IdParticipante: number;
  Nombre: string;
  EsEquipo: boolean;
  SocioId?: number | null;
  EquipoId?: number | null;
}

export interface Fixture {
  IdFixture?: number;
  Tipo: number;
  TorneoId: number;
  Nombre: string;
  NumeroRonda: number;
  Grupo?: string | null;
  FechaInicio?: Date | null;
  FechaFin?: Date | null;
}

export interface Partido {
  ParticipanteAId: number | null;
  ParticipanteBId: number | null;
  FixtureId?: number;
  FechaHora?: Date | null;
  Lugar?: string;
  ArbitroId?: number | null;
  Estado?: number;
  EstadoPartido?: string;
}

export interface GenerarFixtureParams {
  torneoId: number;
  participantes: Participante[];
  fechaInicio?: Date;
  fechaFin?: Date;
}

export interface FixtureGenerado {
  fixtures: Fixture[];
  partidos: Partido[];
  metadata: {
    totalFixtures: number;
    totalPartidos: number;
    tipoTorneo: TipoTorneo;
    validaciones: string[];
  };
}

export interface ValidacionResult {
  valido: boolean;
  mensaje: string;
}
