import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"
import { FixtureContext, TipoTorneo } from "@/lib/services/fixtures"
import type { Participante } from "@/lib/services/fixtures"

export async function POST(request: NextRequest) {
  try {
    const { torneoId, tipoFixture } = await request.json()

    if (!torneoId) {
      return NextResponse.json({ error: "TorneoId es requerido" }, { status: 400 })
    }

    if (tipoFixture === undefined || tipoFixture === null) {
      return NextResponse.json({ error: "tipoFixture es requerido" }, { status: 400 })
    }

    // Validar que tipoFixture sea válido (0, 1, 2)
    const tipoTorneo = Number.parseInt(tipoFixture)
    if (isNaN(tipoTorneo) || tipoTorneo < 0 || tipoTorneo > 2) {
      return NextResponse.json({ 
        error: "tipoFixture inválido. Valores permitidos: 0 (Liga), 1 (Eliminación), 2 (Grupos+Eliminación)" 
      }, { status: 400 })
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
        FROM Fixtures 
        WHERE TorneoId = @torneoId
      `)

    if (fixtureExistente.recordset[0].Total > 0) {
      return NextResponse.json({ 
        error: "Ya existe un fixture para este torneo. Elimina el fixture existente antes de generar uno nuevo." 
      }, { status: 400 })
    }

    // Obtener participantes del torneo
    const participantesResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query(`
        SELECT 
          IdParticipante,
          Nombre,
          EsEquipo,
          SocioId,
          EquipoId
        FROM Participantes
        WHERE TorneoId = @torneoId
        ORDER BY Nombre
      `)

    const participantes: Participante[] = participantesResult.recordset

    if (participantes.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 participantes para generar un fixture" },
        { status: 400 },
      )
    }

    // Crear el contexto con la estrategia apropiada
    const fixtureContext = new FixtureContext(tipoTorneo as TipoTorneo)

    // Validar participantes según el tipo de torneo
    const validacion = fixtureContext.validarParticipantes(participantes)
    if (!validacion.valido) {
      return NextResponse.json({ 
        error: validacion.mensaje 
      }, { status: 400 })
    }

    // Generar fixtures y partidos usando la estrategia
    const fixtureGenerado = fixtureContext.generarFixtures({
      torneoId,
      participantes,
      fechaInicio: torneo.FechaInicio,
      fechaFin: torneo.FechaFin
    })

    // Insertar en la base de datos usando transacción
    const transaction = pool.transaction()
    await transaction.begin()

    try {
      const fixtureIdsMap = new Map<number, number>() // índice temporal -> ID real

      // 1. Actualizar TipoTorneo del torneo con el tipo seleccionado
      await transaction
        .request()
        .input("torneoId", sql.Int, torneoId)
        .input("tipoTorneo", sql.Int, tipoTorneo)
        .query(`UPDATE Torneos SET TipoTorneo = @tipoTorneo WHERE IdTorneo = @torneoId`)

      // 2. Insertar Fixtures
      for (let i = 0; i < fixtureGenerado.fixtures.length; i++) {
        const fixture = fixtureGenerado.fixtures[i]
        
        const result = await transaction
          .request()
          .input("tipo", sql.Int, fixture.Tipo)
          .input("torneoId", sql.Int, fixture.TorneoId)
          .input("nombre", sql.NVarChar, fixture.Nombre)
          .input("numeroRonda", sql.Int, fixture.NumeroRonda)
          .input("grupo", sql.NVarChar, fixture.Grupo)
          .input("fechaInicio", sql.DateTime2, fixture.FechaInicio)
          .input("fechaFin", sql.DateTime2, fixture.FechaFin)
          .query(`
            INSERT INTO Fixtures (Tipo, TorneoId, Nombre, NumeroRonda, Grupo, FechaInicio, FechaFin)
            OUTPUT INSERTED.IdFixture
            VALUES (@tipo, @torneoId, @nombre, @numeroRonda, @grupo, @fechaInicio, @fechaFin)
          `)

        const idFixture = result.recordset[0].IdFixture
        fixtureIdsMap.set(i, idFixture)
      }

      // 3. Insertar Partidos con los IDs reales de fixtures
      for (const partido of fixtureGenerado.partidos) {
        const fixtureIdReal = fixtureIdsMap.get(partido.FixtureId ?? 0)
        
        const request = transaction.request()
          .input("torneoId", sql.Int, torneoId)
          .input("fixtureId", sql.Int, fixtureIdReal)
          .input("fechaHora", sql.DateTime2, partido.FechaHora ?? new Date('1900-01-01'))
          .input("lugar", sql.NVarChar, partido.Lugar ?? "Por definir")
          .input("estado", sql.Int, partido.Estado ?? 0)
          .input("estadoPartido", sql.NVarChar, partido.EstadoPartido ?? "Programado")
        
        // Agregar participantes solo si no son null (permitir TBD)
        if (partido.ParticipanteAId !== null) {
          request.input("participanteAId", sql.Int, partido.ParticipanteAId)
        } else {
          request.input("participanteAId", sql.Int, null)
        }
        
        if (partido.ParticipanteBId !== null) {
          request.input("participanteBId", sql.Int, partido.ParticipanteBId)
        } else {
          request.input("participanteBId", sql.Int, null)
        }
        
        if (partido.ArbitroId !== null) {
          request.input("arbitroId", sql.Int, partido.ArbitroId)
        } else {
          request.input("arbitroId", sql.Int, null)
        }
        
        await request.query(`
          INSERT INTO Partidos (
            TorneoId, ParticipanteAId, ParticipanteBId, 
            FixtureIdFixture, FechaHora, Lugar, Estado, EstadoPartido, ArbitroId
          )
          VALUES (
            @torneoId, @participanteAId, @participanteBId,
            @fixtureId, @fechaHora, @lugar, @estado, @estadoPartido, @arbitroId
          )
        `)
      }

      await transaction.commit()

      return NextResponse.json({
        success: true,
        message: `Fixture generado exitosamente usando estrategia: ${fixtureContext.getInfo().nombre}`,
        fixturesGenerados: fixtureGenerado.fixtures.length,
        partidosGenerados: fixtureGenerado.partidos.length,
        tipoTorneoSeleccionado: tipoTorneo,
        tipoTorneoNombre: fixtureContext.getInfo().nombre,
        metadata: fixtureGenerado.metadata,
        validacion: validacion.mensaje,
      })
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error: any) {
    console.error("Error generating fixture:", error)
    return NextResponse.json({ 
      error: "Error al generar fixture", 
      details: error.message 
    }, { status: 500 })
  }
}
