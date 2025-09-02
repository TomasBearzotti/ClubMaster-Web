import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = Number.parseInt(params.id)
    const { socioId, tipoInscripcion, equipoId } = await request.json()

    if (!socioId || !tipoInscripcion) {
      return NextResponse.json({ error: "SocioId y tipoInscripcion son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar que el torneo existe y está en estado pendiente
    const torneoResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query(`SELECT Estado, MaxParticipantes FROM Torneos WHERE IdTorneo = @torneoId`)

    if (torneoResult.recordset.length === 0) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 })
    }

    const torneo = torneoResult.recordset[0]
    if (torneo.Estado !== 0) {
      return NextResponse.json({ error: "Solo se puede inscribir a torneos pendientes" }, { status: 400 })
    }

    // Verificar límite de participantes
    if (torneo.MaxParticipantes) {
      const participantesActuales = await pool
        .request()
        .input("torneoId", sql.Int, torneoId)
        .query(`SELECT COUNT(*) as Total FROM Participantes WHERE TorneoId = @torneoId`)

      if (participantesActuales.recordset[0].Total >= torneo.MaxParticipantes) {
        return NextResponse.json({ error: "El torneo ha alcanzado el límite máximo de participantes" }, { status: 400 })
      }
    }

    // Verificar inscripción existente
    const inscripcionExistente = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, socioId)
      .query(`
        SELECT p.IdParticipante 
        FROM Participantes p
        LEFT JOIN IntegrantesEquipo ie ON p.EquipoId = ie.EquipoId
        WHERE p.TorneoId = @torneoId 
          AND (p.SocioId = @socioId OR ie.SocioId = @socioId)
      `)

    if (inscripcionExistente.recordset.length > 0) {
      return NextResponse.json({ error: "Ya estás inscrito en este torneo" }, { status: 400 })
    }

    let nombreParticipante: string
    let esEquipo: number
    let equipoIdFinal: number | null = null
    let socioIdFinal: number | null = null

    if (tipoInscripcion === "individual") {
      // Inscripción individual
      const socioResult = await pool
        .request()
        .input("socioId", sql.Int, socioId)
        .query(`SELECT Nombre FROM Socios WHERE IdSocio = @socioId`)

      if (socioResult.recordset.length === 0) {
        return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 })
      }

      nombreParticipante = socioResult.recordset[0].Nombre
      esEquipo = 0
      socioIdFinal = socioId
    } else if (tipoInscripcion === "equipo") {
      // Inscripción por equipo
      if (!equipoId) {
        return NextResponse.json({ error: "EquipoId es requerido para inscripción por equipo" }, { status: 400 })
      }

      // Verificar que el socio pertenece al equipo
      const equipoResult = await pool
        .request()
        .input("equipoId", sql.Int, equipoId)
        .input("socioId", sql.Int, socioId)
        .query(`
          SELECT e.Nombre, e.CapitanId
          FROM Equipos e
          INNER JOIN IntegrantesEquipo ie ON e.IdEquipo = ie.EquipoId
          WHERE e.IdEquipo = @equipoId AND ie.SocioId = @socioId
        `)

      if (equipoResult.recordset.length === 0) {
        return NextResponse.json({ error: "No perteneces a este equipo" }, { status: 400 })
      }

      const equipo = equipoResult.recordset[0]
      if (equipo.CapitanId !== socioId) {
        return NextResponse.json({ error: "Solo el capitán puede inscribir al equipo" }, { status: 400 })
      }

      nombreParticipante = equipo.Nombre
      esEquipo = 1
      equipoIdFinal = equipoId
    } else {
      return NextResponse.json({ error: "Tipo de inscripción inválido" }, { status: 400 })
    }

    // Insertar participante
    await pool
      .request()
      .input("nombre", sql.NVarChar, nombreParticipante)
      .input("esEquipo", sql.Bit, esEquipo)
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, socioIdFinal)
      .input("equipoId", sql.Int, equipoIdFinal)
      .query(`
        INSERT INTO Participantes (Nombre, EsEquipo, TorneoId, SocioId, EquipoId)
        VALUES (@nombre, @esEquipo, @torneoId, @socioId, @equipoId)
      `)

    return NextResponse.json({
      success: true,
      message: `Inscripción exitosa como ${tipoInscripcion === "individual" ? "participante individual" : "equipo"}`,
    })
  } catch (error) {
    console.error("Error inscribiendo:", error)
    return NextResponse.json({ error: "Error al procesar la inscripción" }, { status: 500 })
  }
}
