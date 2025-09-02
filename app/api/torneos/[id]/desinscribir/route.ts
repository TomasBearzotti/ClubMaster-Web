import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = Number.parseInt(params.id)
    const { socioId } = await request.json()

    if (!socioId) {
      return NextResponse.json({ error: "SocioId es requerido" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar que el torneo está en estado pendiente
    const torneoResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query(`SELECT Estado FROM Torneos WHERE IdTorneo = @torneoId`)

    if (torneoResult.recordset.length === 0) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 })
    }

    if (torneoResult.recordset[0].Estado !== 0) {
      return NextResponse.json({ error: "Solo se puede desinscribir de torneos pendientes" }, { status: 400 })
    }

    // Buscar y eliminar inscripción individual
    const inscripcionIndividual = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, socioId)
      .query(`
        DELETE FROM Participantes 
        WHERE TorneoId = @torneoId 
          AND SocioId = @socioId 
          AND EsEquipo = 0
      `)

    if (inscripcionIndividual.rowsAffected[0] > 0) {
      return NextResponse.json({
        success: true,
        message: "Desinscripción individual exitosa",
      })
    }

    // Buscar y eliminar inscripción por equipo (solo si es capitán)
    const inscripcionEquipo = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, socioId)
      .query(`
        DELETE p FROM Participantes p
        INNER JOIN Equipos e ON p.EquipoId = e.IdEquipo
        WHERE p.TorneoId = @torneoId 
          AND e.CapitanId = @socioId 
          AND p.EsEquipo = 1
      `)

    if (inscripcionEquipo.rowsAffected[0] > 0) {
      return NextResponse.json({
        success: true,
        message: "Desinscripción del equipo exitosa",
      })
    }

    return NextResponse.json({ error: "No se encontró inscripción para desinscribir" }, { status: 404 })
  } catch (error) {
    console.error("Error desinscribiendo:", error)
    return NextResponse.json({ error: "Error al procesar la desinscripción" }, { status: 500 })
  }
}
