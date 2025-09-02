import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(request: NextRequest) {
  try {
    const { torneoId, tipoFixture } = await request.json()

    if (!torneoId) {
      return NextResponse.json({ error: "TorneoId es requerido" }, { status: 400 })
    }

    const pool = await getConnection()

    // Obtener información del torneo
    const torneoResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query(`
        SELECT 
          IdTorneo,
          Nombre,
          Disciplina,
          MaxParticipantes,
          FechaInicio,
          FechaFin
        FROM Torneos 
        WHERE IdTorneo = @torneoId
      `)

    if (torneoResult.recordset.length === 0) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 })
    }

    const torneo = torneoResult.recordset[0]

    // Verificar si ya existe un fixture
    const fixtureExistente = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query(`
        SELECT COUNT(*) as Total 
        FROM Partidos 
        WHERE TorneoId = @torneoId
      `)

    if (fixtureExistente.recordset[0].Total > 0) {
      return NextResponse.json({ error: "Ya existe un fixture para este torneo" }, { status: 400 })
    }

    // Obtener participantes del torneo
    const participantesResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query(`
        SELECT 
          IdParticipante,
          Nombre,
          EsEquipo
        FROM Participantes
        WHERE TorneoId = @torneoId
        ORDER BY Nombre
      `)

    const participantes = participantesResult.recordset
    const numParticipantes = participantes.length

    if (numParticipantes < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 participantes para generar un fixture" },
        { status: 400 },
      )
    }

    // Generar fixture según tipo
    let partidos = []
    const tipoSeleccionado = tipoFixture || "eliminacion"

    if (tipoSeleccionado === "eliminacion") {
      // Fixture de eliminación directa
      partidos = generarFixtureEliminacion(participantes)
    } else if (tipoSeleccionado === "todos-contra-todos") {
      // Fixture todos contra todos
      partidos = generarFixtureTodosContraTodos(participantes)
    } else if (tipoSeleccionado === "grupos") {
      // Fixture por grupos
      partidos = generarFixtureGrupos(participantes)
    }

    // Insertar partidos en la base de datos
    const transaction = pool.transaction()
    await transaction.begin()

    try {
      for (const partido of partidos) {
        await transaction
          .request()
          .input("torneoId", sql.Int, torneoId)
          .input("participanteAId", sql.Int, partido.participanteAId)
          .input("participanteBId", sql.Int, partido.participanteBId)
          .input("fase", sql.NVarChar, partido.fase)
          .input("grupo", sql.NVarChar, partido.grupo || null)
          .input("lugar", sql.NVarChar, "Por definir")
          .input("estado", sql.Int, 0) // 0 = Programado
          .input("estadoPartido", sql.NVarChar, "Programado")
          .query(`
            INSERT INTO Partidos (
              TorneoId, ParticipanteAId, ParticipanteBId, 
              Fase, Grupo, Lugar, Estado, EstadoPartido,
              FechaHora
            )
            VALUES (
              @torneoId, @participanteAId, @participanteBId,
              @fase, @grupo, @lugar, @estado, @estadoPartido,
              '1900-01-01 00:00:00'
            )
          `)
      }

      await transaction.commit()

      return NextResponse.json({
        success: true,
        message: `Fixture generado correctamente. ${partidos.length} partidos creados sin fechas. Puedes asignar fechas individualmente.`,
        partidosGenerados: partidos.length,
        tipoFixture: tipoSeleccionado,
      })
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error("Error generating fixture:", error)
    return NextResponse.json({ error: "Error al generar fixture" }, { status: 500 })
  }
}

function generarFixtureEliminacion(participantes: any[]): any[] {
  const partidos: any[] = []

  // Primera ronda - enfrentar participantes de a pares
  for (let i = 0; i < participantes.length - 1; i += 2) {
    if (i + 1 < participantes.length) {
      partidos.push({
        participanteAId: participantes[i].IdParticipante,
        participanteBId: participantes[i + 1].IdParticipante,
        fase: "Primera Ronda",
        grupo: null,
      })
    }
  }

  // Si hay número impar, el último pasa directo
  if (participantes.length % 2 !== 0) {
    console.log("Participante con bye:", participantes[participantes.length - 1].Nombre)
  }

  return partidos
}

function generarFixtureTodosContraTodos(participantes: any[]): any[] {
  const partidos: any[] = []

  for (let i = 0; i < participantes.length; i++) {
    for (let j = i + 1; j < participantes.length; j++) {
      partidos.push({
        participanteAId: participantes[i].IdParticipante,
        participanteBId: participantes[j].IdParticipante,
        fase: "Fase Regular",
        grupo: null,
      })
    }
  }

  return partidos
}

function generarFixtureGrupos(participantes: any[]): any[] {
  const partidos: any[] = []
  const participantesPorGrupo = 4
  const numeroGrupos = Math.ceil(participantes.length / participantesPorGrupo)

  // Dividir participantes en grupos
  for (let grupo = 0; grupo < numeroGrupos; grupo++) {
    const inicioGrupo = grupo * participantesPorGrupo
    const finGrupo = Math.min(inicioGrupo + participantesPorGrupo, participantes.length)
    const participantesGrupo = participantes.slice(inicioGrupo, finGrupo)

    // Generar partidos dentro del grupo (todos contra todos)
    for (let i = 0; i < participantesGrupo.length; i++) {
      for (let j = i + 1; j < participantesGrupo.length; j++) {
        partidos.push({
          participanteAId: participantesGrupo[i].IdParticipante,
          participanteBId: participantesGrupo[j].IdParticipante,
          fase: "Fase de Grupos",
          grupo: String.fromCharCode(65 + grupo), // A, B, C, etc.
        })
      }
    }
  }

  return partidos
}
