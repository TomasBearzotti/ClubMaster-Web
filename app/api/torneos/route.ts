import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest) {
  try {
    const pool = await getConnection()

    const torneosResult = await pool.request().query(`
      SELECT 
        t.IdTorneo,
        t.Nombre,
        t.Disciplina,
        t.FechaInicio,
        t.Estado,
        COUNT(p.IdParticipante) as Participantes
      FROM Torneos t
      LEFT JOIN Participantes p ON t.IdTorneo = p.TorneoId
      GROUP BY t.IdTorneo, t.Nombre, t.Disciplina, t.FechaInicio, t.Estado
      ORDER BY t.FechaInicio DESC
    `)

    return NextResponse.json(torneosResult.recordset)
  } catch (error) {
    console.error("Error fetching torneos:", error)
    return NextResponse.json({ error: "Error al obtener torneos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, disciplina, fechaInicio, fechaFin, descripcion, maxParticipantes, premioGanador } =
      await request.json()

    if (!nombre || !disciplina || !fechaInicio) {
      return NextResponse.json({ error: "Nombre, disciplina y fecha de inicio son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("disciplina", sql.NVarChar, disciplina)
      .input("fechaInicio", sql.DateTime, new Date(fechaInicio))
      .input("fechaFin", sql.DateTime, fechaFin ? new Date(fechaFin) : null)
      .input("descripcion", sql.NVarChar, descripcion)
      .input("maxParticipantes", sql.Int, maxParticipantes)
      .input("premioGanador", sql.NVarChar, premioGanador)
      .query(`
        INSERT INTO Torneos (Nombre, Disciplina, FechaInicio, FechaFin, Descripcion, MaxParticipantes, PremioGanador, Estado)
        VALUES (@nombre, @disciplina, @fechaInicio, @fechaFin, @descripcion, @maxParticipantes, @premioGanador, 0)
      `)

    return NextResponse.json({ success: true, message: "Torneo creado exitosamente" })
  } catch (error) {
    console.error("Error creating torneo:", error)
    return NextResponse.json({ error: "Error al crear torneo" }, { status: 500 })
  }
}
