import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const torneoId = searchParams.get("torneoId")
    const includeStats = searchParams.get("includeStats") === "true"

    const pool = await getConnection()

    let query = `
  SELECT 
    p.IdPartido,
    p.TorneoId,
    t.Nombre as TorneoNombre,
    pa.Nombre as ParticipanteA,
    pb.Nombre as ParticipanteB,
    p.FechaHora,
    p.Fase,
    p.Lugar,
    p.Estado
    ${
      includeStats
        ? `, 
    CASE 
      WHEN EXISTS (SELECT 1 FROM EstadisticasPartido ep WHERE ep.PartidoId = p.IdPartido) 
      THEN 1 
      ELSE 0 
    END as TieneEstadisticas`
        : ""
    }
  FROM Partidos p
  INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
  INNER JOIN Participantes pa ON p.ParticipanteAId = pa.IdParticipante
  LEFT JOIN Participantes pb ON p.ParticipanteBId = pb.IdParticipante
`

    if (torneoId) {
      query += ` WHERE p.TorneoId = @torneoId`
    }

    query += ` ORDER BY p.FechaHora DESC, p.IdPartido DESC`

    const request_query = pool.request()

    if (torneoId) {
      request_query.input("torneoId", sql.Int, Number.parseInt(torneoId))
    }

    const result = await request_query.query(query)

    return NextResponse.json(result.recordset)
  } catch (error) {
    console.error("Error fetching partidos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { torneoId, participanteAId, participanteBId, fechaHora, fase, lugar, arbitroId } = await request.json()

    if (!torneoId || !participanteAId || !fase || !lugar) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    const result = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("participanteAId", sql.Int, participanteAId)
      .input("participanteBId", sql.Int, participanteBId || null)
      .input("fechaHora", sql.DateTime, fechaHora ? new Date(fechaHora) : null)
      .input("fase", sql.NVarChar, fase)
      .input("lugar", sql.NVarChar, lugar)
      .input("arbitroId", sql.Int, arbitroId || null)
      .query(`
        INSERT INTO Partidos (TorneoId, ParticipanteAId, ParticipanteBId, FechaHora, Fase, Lugar, Estado, ArbitroId)
        OUTPUT INSERTED.IdPartido
        VALUES (@torneoId, @participanteAId, @participanteBId, @fechaHora, @fase, @lugar, 0, @arbitroId)
      `)

    return NextResponse.json({
      success: true,
      partidoId: result.recordset[0].IdPartido,
      message: "Partido creado exitosamente",
    })
  } catch (error) {
    console.error("Error creating partido:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
