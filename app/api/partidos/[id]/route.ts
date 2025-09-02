import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const partidoId = params.id
    const pool = await getConnection()

    const result = await pool
      .request()
      .input("partidoId", sql.Int, Number.parseInt(partidoId))
      .query(`
        SELECT 
          p.IdPartido,
          p.TorneoId,
          p.FechaPartido,
          p.HoraPartido,
          p.Lugar,
          p.Fase,
          p.Grupo,
          p.Estado,
          p.EstadoPartido,
          p.ArbitroId,
          t.Nombre as TorneoNombre,
          t.FechaInicio,
          t.FechaFin,
          CASE 
            WHEN part1.EsEquipo = 1 THEN e1.Nombre
            ELSE part1.Nombre
          END as ParticipanteA,
          CASE 
            WHEN part2.EsEquipo = 1 THEN e2.Nombre
            ELSE part2.Nombre
          END as ParticipanteB,
          a.Nombre as ArbitroNombre
        FROM Partidos p
        INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
        LEFT JOIN Participantes part1 ON p.ParticipanteAId = part1.IdParticipante
        LEFT JOIN Participantes part2 ON p.ParticipanteBId = part2.IdParticipante
        LEFT JOIN Equipos e1 ON part1.EquipoId = e1.IdEquipo
        LEFT JOIN Equipos e2 ON part2.EquipoId = e2.IdEquipo
        LEFT JOIN Arbitros a ON p.ArbitroId = a.IdArbitro
        WHERE p.IdPartido = @partidoId
      `)

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })
    }

    const partido = result.recordset[0]

    // Formatear la respuesta
    const partidoFormateado = {
      IdPartido: partido.IdPartido,
      IdTorneo: partido.TorneoId,
      FechaHora:
        partido.FechaPartido && partido.HoraPartido
          ? `${partido.FechaPartido.toISOString().split("T")[0]}T${partido.HoraPartido}`
          : null,
      ParticipanteA: partido.ParticipanteA || "TBD",
      ParticipanteB: partido.ParticipanteB || "TBD",
      Fase: partido.Fase,
      Grupo: partido.Grupo,
      Lugar: partido.Lugar,
      Estado: partido.Estado,
      EstadoPartido: partido.EstadoPartido,
      ArbitroNombre: partido.ArbitroNombre,
      TorneoNombre: partido.TorneoNombre,
      FechaInicio: partido.FechaInicio?.toISOString(),
      FechaFin: partido.FechaFin?.toISOString(),
    }

    return NextResponse.json(partidoFormateado)
  } catch (error: any) {
    console.error("Error obteniendo partido:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const partidoId = params.id
    const { fechaHora, lugar, arbitroId } = await request.json()

    const pool = await getConnection()

    // Verificar que el partido existe y obtener datos del torneo
    const partidoResult = await pool
      .request()
      .input("partidoId", sql.Int, Number.parseInt(partidoId))
      .query(`
        SELECT p.IdPartido, t.FechaInicio, t.FechaFin
        FROM Partidos p
        INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
        WHERE p.IdPartido = @partidoId
      `)

    if (partidoResult.recordset.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })
    }

    const partido = partidoResult.recordset[0]

    // Validar fechas si se proporciona fechaHora
    if (fechaHora) {
      const fechaPartido = new Date(fechaHora)
      const fechaInicio = new Date(partido.FechaInicio)
      const fechaFin = partido.FechaFin ? new Date(partido.FechaFin) : null

      // Validar fecha mínima
      if (fechaPartido < fechaInicio) {
        return NextResponse.json(
          {
            error: `La fecha del partido no puede ser anterior al inicio del torneo (${fechaInicio.toLocaleDateString("es-ES")})`,
          },
          { status: 400 },
        )
      }

      // Validar fecha máxima si existe
      if (fechaFin && fechaPartido > fechaFin) {
        return NextResponse.json(
          {
            error: `La fecha del partido no puede ser posterior al fin del torneo (${fechaFin.toLocaleDateString("es-ES")})`,
          },
          { status: 400 },
        )
      }
    }

    // Preparar los valores para actualizar
    let fechaPartido = null
    let horaPartido = null

    if (fechaHora) {
      const fecha = new Date(fechaHora)
      fechaPartido = fecha.toISOString().split("T")[0]
      horaPartido = fecha.toTimeString().split(" ")[0].substring(0, 5) // HH:MM format
    }

    // Actualizar el partido
    await pool
      .request()
      .input("partidoId", sql.Int, Number.parseInt(partidoId))
      .input("fechaPartido", sql.Date, fechaPartido)
      .input("horaPartido", sql.NVarChar, horaPartido)
      .input("lugar", sql.NVarChar, lugar || "Por definir")
      .input("arbitroId", sql.Int, arbitroId || null)
      .query(`
        UPDATE Partidos 
        SET 
          FechaPartido = @fechaPartido,
          HoraPartido = @horaPartido,
          Lugar = @lugar,
          ArbitroId = @arbitroId
        WHERE IdPartido = @partidoId
      `)

    return NextResponse.json({
      success: true,
      message: "Partido actualizado correctamente",
    })
  } catch (error: any) {
    console.error("Error actualizando partido:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 })
  }
}
