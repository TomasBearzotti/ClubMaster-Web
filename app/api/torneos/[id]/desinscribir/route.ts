import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const socioId = searchParams.get("socioId")

    if (!socioId) {
      return NextResponse.json({ error: "socioId es requerido" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar que el torneo permite desinscripciones
    const torneoResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query("SELECT Estado FROM Torneos WHERE IdTorneo = @torneoId")

    if (torneoResult.recordset.length === 0) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 })
    }

    if (torneoResult.recordset[0].Estado !== 0) {
      return NextResponse.json({ error: "No se puede desinscribir de un torneo que ya comenzó" }, { status: 400 })
    }

    // Intentar eliminar inscripción individual
    const resultIndividual = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, Number.parseInt(socioId))
      .query(`
        DELETE FROM Participantes 
        WHERE TorneoId = @torneoId 
        AND SocioId = @socioId 
        AND EsEquipo = 0
      `)

    if (resultIndividual.rowsAffected[0] > 0) {
      return NextResponse.json({ message: "Desinscripción individual exitosa" }, { status: 200 })
    }

    // Intentar eliminar inscripción por equipo
    const resultEquipo = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, Number.parseInt(socioId))
      .query(`
        DELETE p FROM Participantes p
        INNER JOIN IntegrantesEquipo ie ON p.EquipoId = ie.EquipoId
        WHERE p.TorneoId = @torneoId 
        AND ie.SocioId = @socioId 
        AND p.EsEquipo = 1
      `)

    if (resultEquipo.rowsAffected[0] > 0) {
      return NextResponse.json({ message: "Desinscripción por equipo exitosa" }, { status: 200 })
    }

    // Si no había inscripción
    return NextResponse.json({ error: "No se encontró inscripción para este socio" }, { status: 404 })

  } catch (error) {
    console.error("Error en desinscripción:", error)
    return NextResponse.json({ error: "Error al procesar desinscripción" }, { status: 500 })
  }
}