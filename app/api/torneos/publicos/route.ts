import { NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"

export async function GET() {
  try {
    const pool = await getConnection()

    const torneosResult = await pool.request().query(`
      SELECT 
        t.IdTorneo,
        t.Nombre,
        t.Disciplina,
        t.FechaInicio,
        t.Estado,
        t.Descripcion,
        t.MaxParticipantes,
        t.FechaFin,
        t.PremioGanador,
        COUNT(p.IdParticipante) as ParticipantesActuales
      FROM Torneos t
      LEFT JOIN Participantes p ON t.IdTorneo = p.TorneoId
      WHERE t.Estado != 3
      GROUP BY t.IdTorneo, t.Nombre, t.Disciplina, t.FechaInicio, t.Estado, 
               t.Descripcion, t.MaxParticipantes, t.FechaFin, t.PremioGanador
      ORDER BY t.Estado ASC
    `)

    const torneos = torneosResult.recordset.map((torneo) => ({
      IdTorneo: torneo.IdTorneo,
      Nombre: torneo.Nombre,
      NombreDeporte: torneo.Disciplina,
      Descripcion: torneo.Descripcion,
      FechaInicio: torneo.FechaInicio,
      FechaFin: torneo.FechaFin,
      Estado: torneo.Estado,
      MaxParticipantes: torneo.MaxParticipantes,
      PremioGanador: torneo.PremioGanador,
      ParticipantesActuales: torneo.ParticipantesActuales,
    }))

    return NextResponse.json(torneos)
  } catch (error) {
    console.error("Error obteniendo torneos públicos:", error)
    return NextResponse.json({ error: "Error al obtener torneos" }, { status: 500 })
  }
}
