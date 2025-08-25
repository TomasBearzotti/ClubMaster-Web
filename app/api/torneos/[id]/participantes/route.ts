import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = Number.parseInt(params.id)

    const pool = await getConnection()

    const participantesResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query(`
        SELECT 
          p.IdParticipante,
          p.Nombre,
          p.EsEquipo,
          p.SocioId,
          p.EquipoId,
          CASE 
            WHEN p.EsEquipo = 0 THEN s.Nombre
            ELSE e.Nombre
          END as NombreCompleto
        FROM Participantes p
        LEFT JOIN Socios s ON p.SocioId = s.IdSocio
        LEFT JOIN Equipos e ON p.EquipoId = e.IdEquipo
        WHERE p.TorneoId = @torneoId
        ORDER BY p.EsEquipo, p.Nombre
      `)

    const participantes = participantesResult.recordset.map((p) => ({
      id: p.IdParticipante,
      nombre: p.Nombre,
      nombreCompleto: p.NombreCompleto,
      esEquipo: p.EsEquipo,
      socioId: p.SocioId,
      equipoId: p.EquipoId,
    }))

    return NextResponse.json(participantes)
  } catch (error) {
    console.error("Error obteniendo participantes:", error)
    return NextResponse.json({ error: "Error al obtener participantes" }, { status: 500 })
  }
}
