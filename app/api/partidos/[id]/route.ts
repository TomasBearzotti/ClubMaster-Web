import { NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const partidoId = parseInt(params.id)
    const pool = await getConnection()

    const result = await pool
      .request()
      .input("partidoId", sql.Int, partidoId)
      .query(`
        SELECT 
        p.IdPartido,
        p.FechaHora,
        p.Estado,
        pa.Nombre AS EquipoA,
        pb.Nombre AS EquipoB,
        t.Nombre AS Torneo
      FROM Partidos p
      INNER JOIN Participantes pa ON pa.IdParticipante = p.ParticipanteAId
      LEFT JOIN Participantes pb ON pb.IdParticipante = p.ParticipanteBId
      INNER JOIN Torneos t ON t.IdTorneo = p.TorneoId
      WHERE p.TorneoId = @torneoId
      `)

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })
    }

    return NextResponse.json(result.recordset[0])
  } catch (error) {
    console.error("Error fetching partido:", error)
    return NextResponse.json({ error: "Error al obtener el partido" }, { status: 500 })
  }
}
