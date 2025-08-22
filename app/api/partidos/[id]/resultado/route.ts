import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const partidoId = Number.parseInt(params.id)
    const { resultadoEquipo1, resultadoEquipo2, observaciones, estado } = await request.json()

    if (resultadoEquipo1 === undefined || resultadoEquipo2 === undefined) {
      return NextResponse.json({ error: "Ambos resultados son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verify the match exists
    const existingPartido = await pool
      .request()
      .input("partidoId", sql.Int, partidoId)
      .query("SELECT IdPartido FROM Partidos WHERE IdPartido = @partidoId")

    if (existingPartido.recordset.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })
    }

    // Update the match result
    await pool
      .request()
      .input("partidoId", sql.Int, partidoId)
      .input("resultadoEquipo1", sql.Int, resultadoEquipo1)
      .input("resultadoEquipo2", sql.Int, resultadoEquipo2)
      .input("observaciones", sql.NVarChar, observaciones || null)
      .input("estado", sql.Int, estado || 2) // 2 = Finalizado
      .query(`
        UPDATE Partidos 
        SET 
          ResultadoEquipo1 = @resultadoEquipo1,
          ResultadoEquipo2 = @resultadoEquipo2,
          Observaciones = @observaciones,
          Estado = @estado
        WHERE IdPartido = @partidoId
      `)

    return NextResponse.json({
      success: true,
      message: "Resultado registrado exitosamente",
    })
  } catch (error) {
    console.error("Error updating match result:", error)
    return NextResponse.json({ error: "Error interno del servidor al registrar resultado" }, { status: 500 })
  }
}
