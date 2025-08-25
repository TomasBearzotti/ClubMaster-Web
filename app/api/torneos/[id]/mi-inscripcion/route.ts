import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const socioId = searchParams.get("socioId")

    if (!socioId) {
      return NextResponse.json({ error: "socioId es requerido" }, { status: 400 })
    }

    const socioIdNum = Number.parseInt(socioId)
    const pool = await getConnection()

    // Verificar inscripción individual
    const inscripcionIndividual = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, socioIdNum)
      .query(`
        SELECT 
          p.IdParticipante, 
          p.Nombre as NombreParticipante,
          p.SocioId,
          p.EsEquipo
        FROM Participantes p
        WHERE p.TorneoId = @torneoId 
        AND p.SocioId = @socioId 
        AND p.EsEquipo = 0
      `)

    if (inscripcionIndividual.recordset.length > 0) {
      const participante = inscripcionIndividual.recordset[0]
      return NextResponse.json({
        inscrito: true,
        participante: {
          id: participante.IdParticipante,
          nombre: participante.NombreParticipante,
          esEquipo: false,
          socioId: participante.SocioId,
        },
      })
    }

    // Verificar inscripción por equipo
    const inscripcionEquipo = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, socioIdNum)
      .query(`
        SELECT 
          p.IdParticipante, 
          p.Nombre as NombreParticipante, 
          p.EquipoId,
          p.EsEquipo
        FROM Participantes p
        INNER JOIN IntegrantesEquipo ie ON p.EquipoId = ie.EquipoId
        WHERE p.TorneoId = @torneoId 
        AND ie.SocioId = @socioId 
        AND p.EsEquipo = 1
      `)

    if (inscripcionEquipo.recordset.length > 0) {
      const participante = inscripcionEquipo.recordset[0]
      return NextResponse.json({
        inscrito: true,
        participante: {
          id: participante.IdParticipante,
          nombre: participante.NombreParticipante,
          esEquipo: true,
          equipoId: participante.EquipoId,
        },
      })
    }

    return NextResponse.json({ inscrito: false })

  } catch (error) {
    console.error("Error verificando inscripción:", error)
    return NextResponse.json({ error: "Error al verificar inscripción" }, { status: 500 })
  }
}