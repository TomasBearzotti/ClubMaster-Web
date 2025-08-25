import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

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
        COUNT(p.IdParticipante) as Participantes
      FROM Torneos t
      LEFT JOIN Participantes p ON t.IdTorneo = p.TorneoId
      GROUP BY t.IdTorneo, t.Nombre, t.Disciplina, t.FechaInicio, t.Estado, 
               t.Descripcion, t.MaxParticipantes, t.FechaFin, t.PremioGanador
      ORDER BY t.FechaInicio DESC
    `)

    const torneos = torneosResult.recordset.map((torneo) => ({
      IdTorneo: torneo.IdTorneo,
      Nombre: torneo.Nombre,
      Disciplina: torneo.Disciplina,
      FechaInicio: torneo.FechaInicio,
      Estado: torneo.Estado,
      Descripcion: torneo.Descripcion,
      MaxParticipantes: torneo.MaxParticipantes,
      FechaFin: torneo.FechaFin,
      PremioGanador: torneo.PremioGanador,
      Participantes: torneo.Participantes,
    }))

    return NextResponse.json(torneos)
  } catch (error) {
    console.error("Error obteniendo torneos:", error)
    return NextResponse.json({ error: "Error al obtener torneos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, disciplina, fechaInicio, descripcion, maxParticipantes, fechaFin, premioGanador } =
      await request.json()

    if (!nombre || !disciplina || !fechaInicio) {
      return NextResponse.json({ error: "Datos requeridos: nombre, disciplina, fechaInicio" }, { status: 400 })
    }

    const pool = await getConnection()

    await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("disciplina", sql.NVarChar, disciplina)
      .input("fechaInicio", sql.DateTime2, new Date(fechaInicio))
      .input("estado", sql.Int, 0) // 0 = Pendiente
      .input("descripcion", sql.NVarChar, descripcion || null)
      .input("maxParticipantes", sql.Int, maxParticipantes || null)
      .input("fechaFin", sql.DateTime, fechaFin ? new Date(fechaFin) : null)
      .input("premioGanador", sql.NVarChar, premioGanador || null)
      .query(`
        INSERT INTO Torneos (Nombre, Disciplina, FechaInicio, Estado, Descripcion, MaxParticipantes, FechaFin, PremioGanador)
        VALUES (@nombre, @disciplina, @fechaInicio, @estado, @descripcion, @maxParticipantes, @fechaFin, @premioGanador)
      `)

    return NextResponse.json({ success: true, message: "Torneo creado exitosamente" })
  } catch (error) {
    console.error("Error creando torneo:", error)
    return NextResponse.json({ error: "Error al crear torneo" }, { status: 500 })
  }
}
