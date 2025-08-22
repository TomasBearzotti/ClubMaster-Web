import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const socioId = searchParams.get("socioId")

    console.log("📥 Request mi-inscripcion:", { torneoId, socioId })

    if (!socioId) {
      console.warn("⚠️ socioId no enviado en la query")
      return NextResponse.json({ error: "socioId es requerido" }, { status: 400 })
    }

    const pool = await getConnection()

    // 🔎 Verificar inscripción individual
    const inscripcionIndividual = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, Number.parseInt(socioId))
      .query(`
        SELECT p.IdParticipante, s.Nombre as NombreSocio
        FROM Participantes p
        INNER JOIN Socios s ON p.SocioId = s.IdSocio
        WHERE p.TorneoId = @torneoId 
        AND p.SocioId = @socioId 
        AND p.EsEquipo = 0
      `)

    console.log("🔎 Resultado inscripcionIndividual:", inscripcionIndividual.recordset)

    if (inscripcionIndividual.recordset.length > 0) {
      const participante = inscripcionIndividual.recordset[0]
      console.log("✅ Encontrada inscripción individual:", participante)

      return NextResponse.json({
        inscrito: true,
        participante: {
          id: participante.IdParticipante,
          nombre: participante.NombreSocio,
          esEquipo: false,
          socioId: Number.parseInt(socioId),
        },
      })
    }

    // 🔎 Verificar inscripción por equipo
    const inscripcionEquipo = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, Number.parseInt(socioId))
      .query(`
        SELECT TOP 1 p.IdParticipante, e.Nombre as NombreEquipo, p.EquipoId
        FROM Participantes p
        INNER JOIN Equipos e ON p.EquipoId = e.IdEquipo
        INNER JOIN IntegrantesEquipo ie ON e.IdEquipo = ie.EquipoId
        WHERE p.TorneoId = @torneoId 
        AND ie.SocioId = @socioId 
        AND p.EsEquipo = 1
      `)

    console.log("🔎 Resultado inscripcionEquipo:", inscripcionEquipo.recordset)

    if (inscripcionEquipo.recordset.length > 0) {
      const participante = inscripcionEquipo.recordset[0]
      console.log("✅ Encontrada inscripción por equipo:", participante)

      return NextResponse.json({
        inscrito: true,
        participante: {
          id: participante.IdParticipante,
          nombre: participante.NombreEquipo,
          esEquipo: true,
          equipoId: participante.EquipoId,
        },
      })
    }

    console.log("❌ No se encontró inscripción")
    return NextResponse.json({ inscrito: false })
  } catch (error) {
    console.error("💥 Error verificando inscripción:", error)
    return NextResponse.json({ error: "Error al verificar inscripción" }, { status: 500 })
  }
}
