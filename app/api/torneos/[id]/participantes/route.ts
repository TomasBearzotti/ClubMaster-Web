import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = params.id
    const pool = await getConnection()

    const result = await pool
      .request()
      .input("torneoId", sql.Int, Number.parseInt(torneoId))
      .query(`
        SELECT 
          p.IdParticipante as id,
          p.Nombre as nombre,
          CASE 
            WHEN p.EsEquipo = 1 THEN 'Equipo'
            ELSE 'Individual'
          END as tipo,
          p.EsEquipo as esEquipo,
          p.SocioId as socioId,
          p.EquipoId as equipoId
        FROM Participantes p
        WHERE p.TorneoId = @torneoId
        ORDER BY p.Nombre
      `)

    return NextResponse.json(result.recordset)
  } catch (error: any) {
    console.error("Error obteniendo participantes:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
