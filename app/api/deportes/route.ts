import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET() {
  try {
    const pool = await getConnection()
    const result = await pool.request().query(`
      SELECT IdDeporte, Nombre, MaxParticipantes
      FROM Deportes
      ORDER BY Nombre
    `)

    return NextResponse.json(result.recordset)
  } catch (error) {
    console.error("Error fetching deportes:", error)
    return NextResponse.json({ error: "Error al obtener deportes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, maxParticipantes } = await request.json()

    if (!nombre || maxParticipantes === undefined || maxParticipantes === null) {
      return NextResponse.json({ error: "Nombre y máximo de participantes son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()
    const result = await pool
      .request()
      .input("nombre", sql.NVarChar, nombre)
      .input("maxParticipantes", sql.Int, maxParticipantes)
      .query(`
        INSERT INTO Deportes (Nombre, MaxParticipantes)
        OUTPUT INSERTED.IdDeporte
        VALUES (@nombre, @maxParticipantes)
      `)

    return NextResponse.json({
      success: true,
      deporteId: result.recordset[0].IdDeporte,
      message: "Deporte creado exitosamente",
    })
  } catch (error) {
    console.error("Error creating deporte:", error)
    return NextResponse.json({ error: "Error interno del servidor al crear deporte" }, { status: 500 })
  }
}
