import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"

export async function GET(request: NextRequest) {
  try {
    const pool = await getConnection()

    const query = `
      SELECT 
        IdReporte,
        Nombre,
        Tipo,
        NombreArchivo,
        FechaCreacion,
        Filtros
      FROM ReportesGuardados
      ORDER BY FechaCreacion DESC
    `

    const result = await pool.request().query(query)

    // Parsear filtros JSON
    const reportes = result.recordset.map((reporte: any) => ({
      ...reporte,
      Filtros: reporte.Filtros ? JSON.parse(reporte.Filtros) : {},
    }))

    return NextResponse.json(reportes)
  } catch (error: any) {
    console.error("Error al obtener reportes guardados:", error)
    return NextResponse.json({ error: "Error al obtener reportes guardados", details: error.message }, { status: 500 })
  }
}
