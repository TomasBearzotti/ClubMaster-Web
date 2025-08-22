import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const torneoId = Number.parseInt(params.id)
    const { socioId, tipoInscripcion, equipoId } = await request.json()

    if (!socioId || !tipoInscripcion) {
      return NextResponse.json({ error: "socioId y tipoInscripcion son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar que el torneo existe y está abierto
    const torneoResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query("SELECT Estado, MaxParticipantes FROM Torneos WHERE IdTorneo = @torneoId")

    if (torneoResult.recordset.length === 0) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 })
    }

    const torneo = torneoResult.recordset[0]
    if (torneo.Estado !== 0) {
      return NextResponse.json({ error: "El torneo no está abierto para inscripciones" }, { status: 400 })
    }

    // Verificar límite de participantes
    if (torneo.MaxParticipantes) {
      const participantesResult = await pool
        .request()
        .input("torneoId", sql.Int, torneoId)
        .query("SELECT COUNT(*) as Total FROM Participantes WHERE TorneoId = @torneoId")

      if (participantesResult.recordset[0].Total >= torneo.MaxParticipantes) {
        return NextResponse.json({ error: "El torneo ha alcanzado el límite de participantes" }, { status: 400 })
      }
    }

    // Verificar inscripción previa
    const inscripcionPrevia = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .input("socioId", sql.Int, socioId)
      .query(`
        SELECT COUNT(*) as Total FROM Participantes p
        LEFT JOIN IntegrantesEquipo ie ON p.EquipoId = ie.EquipoId
        WHERE p.TorneoId = @torneoId 
        AND (p.SocioId = @socioId OR ie.SocioId = @socioId)
      `)

    if (inscripcionPrevia.recordset[0].Total > 0) {
      return NextResponse.json({ error: "Ya estás inscrito en este torneo" }, { status: 400 })
    }

    if (tipoInscripcion === "individual") {
      // Obtener nombre del socio
      const socioResult = await pool
        .request()
        .input("socioId", sql.Int, socioId)
        .query("SELECT Nombre FROM Socios WHERE IdSocio = @socioId")

      if (socioResult.recordset.length === 0) {
        return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 })
      }

      const nombreSocio = socioResult.recordset[0].Nombre

      // Inscripción individual
      await pool
        .request()
        .input("nombre", sql.NVarChar, nombreSocio)
        .input("esEquipo", sql.Bit, 0)
        .input("torneoId", sql.Int, torneoId)
        .input("socioId", sql.Int, socioId)
        .query(`
          INSERT INTO Participantes (Nombre, EsEquipo, TorneoId, SocioId, EquipoId)
          VALUES (@nombre, @esEquipo, @torneoId, @socioId, NULL)
        `)

      return NextResponse.json({ message: "Inscripción individual exitosa" })
    } else if (tipoInscripcion === "equipo") {
      if (!equipoId) {
        return NextResponse.json({ error: "equipoId es requerido para inscripción por equipo" }, { status: 400 })
      }

      // Verificar que el socio pertenece al equipo
      const integranteResult = await pool
        .request()
        .input("equipoId", sql.Int, equipoId)
        .input("socioId", sql.Int, socioId)
        .query("SELECT COUNT(*) as Total FROM IntegrantesEquipo WHERE EquipoId = @equipoId AND SocioId = @socioId")

      if (integranteResult.recordset[0].Total === 0) {
        return NextResponse.json({ error: "No perteneces a este equipo" }, { status: 400 })
      }

      // Obtener nombre del equipo
      const equipoResult = await pool
        .request()
        .input("equipoId", sql.Int, equipoId)
        .query("SELECT Nombre FROM Equipos WHERE IdEquipo = @equipoId")

      if (equipoResult.recordset.length === 0) {
        return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 })
      }

      const nombreEquipo = equipoResult.recordset[0].Nombre

      // Inscripción por equipo
      await pool
        .request()
        .input("nombre", sql.NVarChar, nombreEquipo)
        .input("esEquipo", sql.Bit, 1)
        .input("torneoId", sql.Int, torneoId)
        .input("equipoId", sql.Int, equipoId)
        .query(`
          INSERT INTO Participantes (Nombre, EsEquipo, TorneoId, SocioId, EquipoId)
          VALUES (@nombre, @esEquipo, @torneoId, NULL, @equipoId)
        `)

      return NextResponse.json({ message: "Inscripción por equipo exitosa" })
    }

    return NextResponse.json({ error: "Tipo de inscripción no válido" }, { status: 400 })
  } catch (error) {
    console.error("Error en inscripción:", error)
    return NextResponse.json({ error: "Error al procesar inscripción" }, { status: 500 })
  }
}
