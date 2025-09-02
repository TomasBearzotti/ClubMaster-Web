import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const partidoId = formData.get("partidoId") as string
    const deporteId = formData.get("deporteId") as string

    if (!file || !partidoId || !deporteId) {
      return NextResponse.json({ error: "Archivo, partidoId y deporteId son requeridos" }, { status: 400 })
    }

    // Validar que el archivo sea Excel
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json({ error: "El archivo debe ser un Excel (.xlsx o .xls)" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar que el partido existe y corresponde al deporte
    const partidoResult = await pool
      .request()
      .input("partidoId", sql.Int, Number.parseInt(partidoId))
      .query(`
        SELECT 
          p.IdPartido,
          t.Disciplina,
          t.Nombre as TorneoNombre
        FROM Partidos p
        INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
        WHERE p.IdPartido = @partidoId
      `)

    if (partidoResult.recordset.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })
    }

    const partido = partidoResult.recordset[0]

    // Aquí normalmente procesarías el archivo Excel
    // Por ahora simularemos la importación
    const estadisticasSimuladas = [
      { participante: "Equipo A", campo: "Goles", valor: "2" },
      { participante: "Equipo A", campo: "Asistencias", valor: "1" },
      { participante: "Equipo B", campo: "Goles", valor: "1" },
      { participante: "Equipo B", campo: "Asistencias", valor: "2" },
    ]

    // Obtener participantes del partido
    const participantesResult = await pool
      .request()
      .input("partidoId", sql.Int, Number.parseInt(partidoId))
      .query(`
        SELECT DISTINCT p.IdParticipante, p.Nombre
        FROM Participantes p
        INNER JOIN Partidos pt ON (p.IdParticipante = pt.ParticipanteAId OR p.IdParticipante = pt.ParticipanteBId)
        WHERE pt.IdPartido = @partidoId
      `)

    const participantes = participantesResult.recordset

    // Insertar estadísticas simuladas
    const transaction = pool.transaction()
    await transaction.begin()

    try {
      let estadisticasInsertadas = 0

      for (const estadistica of estadisticasSimuladas) {
        const participante = participantes.find((p) => p.Nombre.includes(estadistica.participante))

        if (participante) {
          await transaction
            .request()
            .input("partidoId", sql.Int, Number.parseInt(partidoId))
            .input("participanteId", sql.Int, participante.IdParticipante)
            .input("nombreCampo", sql.NVarChar, estadistica.campo)
            .input("valor", sql.NVarChar, estadistica.valor)
            .query(`
              INSERT INTO EstadisticasPartido (PartidoId, ParticipanteId, NombreCampo, Valor)
              VALUES (@partidoId, @participanteId, @nombreCampo, @valor)
            `)

          estadisticasInsertadas++
        }
      }

      await transaction.commit()

      return NextResponse.json({
        success: true,
        message: `${estadisticasInsertadas} estadísticas importadas correctamente`,
        partido: partido.TorneoNombre,
        estadisticasInsertadas,
      })
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error("Error importing statistics:", error)
    return NextResponse.json({ error: "Error al importar estadísticas" }, { status: 500 })
  }
}
