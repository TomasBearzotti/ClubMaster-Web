import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deporteId = searchParams.get("deporteId")

    if (!deporteId) {
      return NextResponse.json({ error: "DeporteId es requerido" }, { status: 400 })
    }

    const pool = await getConnection()

    // Obtener equipos por deporte (usando la disciplina del equipo)
    const equiposResult = await pool
      .request()
      .input("disciplina", sql.NVarChar, deporteId) // Asumiendo que se pasa el nombre del deporte
      .query(`
        SELECT 
          e.IdEquipo,
          e.Nombre,
          e.Disciplina,
          s.Nombre + ' ' + ISNULL(s.Apellido, '') as Capitan,
          e.FechaCreacion,
          COUNT(ie.SocioId) as TotalIntegrantes
        FROM Equipos e
        INNER JOIN Socios s ON e.CapitanId = s.IdSocio
        LEFT JOIN IntegrantesEquipo ie ON e.IdEquipo = ie.EquipoId
        WHERE e.Disciplina = @disciplina
        GROUP BY e.IdEquipo, e.Nombre, e.Disciplina, s.Nombre, s.Apellido, e.FechaCreacion
        ORDER BY e.Nombre
      `)

    return NextResponse.json(equiposResult.recordset)
  } catch (error) {
    console.error("Error fetching equipos por deporte:", error)
    return NextResponse.json({ error: "Error al obtener equipos" }, { status: 500 })
  }
}
