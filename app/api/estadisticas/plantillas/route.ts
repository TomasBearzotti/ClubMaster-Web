import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(request: NextRequest) {
  try {
    const { deporteId, partidoId } = await request.json()

    if (!deporteId) {
      return NextResponse.json({ error: "DeporteId es requerido" }, { status: 400 })
    }

    const pool = await getConnection()

    // Obtener plantilla de estadísticas para el deporte
    const plantillaResult = await pool
      .request()
      .input("deporteId", sql.Int, deporteId)
      .query(`
        SELECT 
          NombreCampo,
          TipoDato,
          EsObligatorio,
          Orden
        FROM PlantillasEstadisticas
        WHERE DeporteId = @deporteId
        ORDER BY Orden
      `)

    const plantilla = plantillaResult.recordset

    // Si se proporciona partidoId, obtener información del partido
    let infoPartido = null
    if (partidoId) {
      const partidoResult = await pool
        .request()
        .input("partidoId", sql.Int, partidoId)
        .query(`
          SELECT 
            p.IdPartido,
            p.FechaPartido,
            p.HoraPartido,
            pa.Nombre as ParticipanteA,
            pb.Nombre as ParticipanteB,
            t.Nombre as Torneo,
            t.Disciplina
          FROM Partidos p
          INNER JOIN Participantes pa ON p.ParticipanteAId = pa.IdParticipante
          LEFT JOIN Participantes pb ON p.ParticipanteBId = pb.IdParticipante
          INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
          WHERE p.IdPartido = @partidoId
        `)

      infoPartido = partidoResult.recordset[0]
    }

    // Generar estructura de plantilla Excel
    const plantillaExcel = {
      headers: ["Participante", "Tipo", ...plantilla.map((p) => p.NombreCampo)],
      campos: plantilla,
      infoPartido: infoPartido,
      instrucciones: [
        "Complete los datos de estadísticas para cada participante",
        'Tipo: "Equipo" o "Individual"',
        "Deje en blanco los campos que no apliquen",
        "Los campos marcados como obligatorios deben completarse",
      ],
    }

    return NextResponse.json({
      success: true,
      plantilla: plantillaExcel,
      message: "Plantilla generada correctamente",
    })
  } catch (error) {
    console.error("Error generating template:", error)
    return NextResponse.json({ error: "Error al generar plantilla" }, { status: 500 })
  }
}
