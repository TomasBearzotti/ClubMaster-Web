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
        p.IdTorneo,
        p.FechaPartido,
        p.HoraPartido,
        p.EquipoA,
        p.EquipoB,
        p.Fase,
        p.Lugar,
        p.EstadoPartido,
        p.ArbitroId,
        a.Nombre AS ArbitroNombre
      FROM Partidos p
      LEFT JOIN Arbitros a ON p.ArbitroId = a.IdArbitro
    `
    if (torneoId) {
      query += ` WHERE p.IdTorneo = @torneoId`
    }
    query += ` ORDER BY p.FechaPartido, p.HoraPartido`

    const requestQuery = pool.request()
    if (torneoId) {
      requestQuery.input("torneoId", sql.Int, Number.parseInt(torneoId))
    }

    const result = await requestQuery.query(query)

    return NextResponse.json(result.recordset)
  } catch (error) {
    console.error("Error fetching partidos:", error)
    return NextResponse.json({ error: "Error al obtener partidos" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, arbitroId } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID de partido es requerido" }, { status: 400 })
    }

    const pool = await getConnection()
    const result = await pool
      .request()
      .input("idPartido", sql.Int, id)
      .input("arbitroId", sql.Int, arbitroId === null ? null : arbitroId) // Allow null for unassigning
      .query(`
        UPDATE Partidos
        SET ArbitroId = @arbitroId
        WHERE IdPartido = @idPartido
      `)

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Partido no encontrado o no se pudo actualizar" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Árbitro asignado exitosamente" })
  } catch (error) {
    console.error("Error assigning arbitro to partido:", error)
    return NextResponse.json({ error: "Error interno del servidor al asignar árbitro" }, { status: 500 })
  }
}
