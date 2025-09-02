import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const torneoId = searchParams.get("torneoId")

    const pool = await getConnection()

    let query = `
      SELECT 
        p.IdPartido,
        p.TorneoId,
        p.FechaPartido,
        p.HoraPartido,
        p.Fase,
        p.Grupo,
        p.Lugar,
        p.Estado,
        p.EstadoPartido,
        p.ArbitroId,
        CASE 
          WHEN part1.EsEquipo = 1 THEN e1.Nombre
          ELSE part1.Nombre
        END as EquipoA,
        CASE 
          WHEN part2.EsEquipo = 1 THEN e2.Nombre
          ELSE part2.Nombre
        END as EquipoB,
        a.Nombre as ArbitroNombre,
        t.Nombre as TorneoNombre,
        t.FechaInicio,
        t.FechaFin
      FROM Partidos p
      INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
      LEFT JOIN Participantes part1 ON p.ParticipanteAId = part1.IdParticipante
      LEFT JOIN Participantes part2 ON p.ParticipanteBId = part2.IdParticipante
      LEFT JOIN Equipos e1 ON part1.EquipoId = e1.IdEquipo
      LEFT JOIN Equipos e2 ON part2.EquipoId = e2.IdEquipo
      LEFT JOIN Arbitros a ON p.ArbitroId = a.IdArbitro
    `

    const request_builder = pool.request()

    if (torneoId) {
      query += " WHERE p.TorneoId = @torneoId"
      request_builder.input("torneoId", sql.Int, Number.parseInt(torneoId))
    }

    query += " ORDER BY p.FechaPartido ASC, p.HoraPartido ASC, p.Fase ASC"

    const result = await request_builder.query(query)

    // Formatear la respuesta
    const partidos = result.recordset.map((partido) => ({
      IdPartido: partido.IdPartido,
      IdTorneo: partido.TorneoId,
      FechaHora:
        partido.FechaPartido && partido.HoraPartido
          ? `${partido.FechaPartido.toISOString().split("T")[0]}T${partido.HoraPartido}`
          : null,
      ParticipanteA: partido.EquipoA || "TBD",
      ParticipanteB: partido.EquipoB || "TBD",
      Fase: partido.Fase || "Fase de Grupos",
      Grupo: partido.Grupo,
      Lugar: partido.Lugar || "Por definir",
      Estado: partido.Estado || 0,
      ArbitroNombre: partido.ArbitroNombre,
      TorneoNombre: partido.TorneoNombre,
      FechaInicio: partido.FechaInicio?.toISOString(),
      FechaFin: partido.FechaFin?.toISOString(),
    }))

    return NextResponse.json(partidos)
  } catch (error: any) {
    console.error("Error obteniendo partidos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
