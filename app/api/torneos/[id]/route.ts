import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = Number.parseInt(params.id)

    const pool = await getConnection()

    const torneoResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query(`
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
        WHERE t.IdTorneo = @torneoId
        GROUP BY t.IdTorneo, t.Nombre, t.Disciplina, t.FechaInicio, t.Estado, 
                 t.Descripcion, t.MaxParticipantes, t.FechaFin, t.PremioGanador
      `)

    if (torneoResult.recordset.length === 0) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 })
    }

    const torneo = torneoResult.recordset[0]

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error("Error obteniendo torneo:", error)
    return NextResponse.json({ error: "Error al obtener torneo" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = Number.parseInt(params.id)
    const { estado } = await request.json()

    if (estado === undefined) {
      return NextResponse.json({ error: "Estado es requerido" }, { status: 400 })
    }

    const pool = await getConnection()

    await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("estado", sql.Int, estado)
      .query("UPDATE Torneos SET Estado = @estado WHERE IdTorneo = @torneoId")

    return NextResponse.json({ success: true, message: "Torneo actualizado exitosamente" })
  } catch (error) {
    console.error("Error actualizando torneo:", error)
    return NextResponse.json({ error: "Error al actualizar torneo" }, { status: 500 })
  }
}
