import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(request: NextRequest) {
  try {
    const { torneoId, tipoFixture } = await request.json()

    if (!torneoId) {
      return NextResponse.json({ error: "TorneoId es requerido" }, { status: 400 })
    }

    const pool = await getConnection()

    // Obtener número de participantes
    const participantesResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId)
      .query(`
        SELECT COUNT(*) as Total
        FROM Participantes
        WHERE TorneoId = @torneoId
      `)

    const numParticipantes = participantesResult.recordset[0].Total

    // Validar según tipo de fixture
    let esValido = false
    let mensaje = ""
    let partidosEstimados = 0

    switch (tipoFixture) {
      case "eliminacion":
        esValido = numParticipantes >= 2
        if (esValido) {
          partidosEstimados = Math.floor(numParticipantes / 2) // Primera ronda
          mensaje = `✅ Válido para eliminación directa. Se generarán ${partidosEstimados} partidos en la primera ronda.`
        } else {
          mensaje = `❌ Se necesitan al menos 2 participantes. Actual: ${numParticipantes}`
        }
        break

      case "todos-contra-todos":
        esValido = numParticipantes >= 3 && numParticipantes <= 12
        if (esValido) {
          partidosEstimados = (numParticipantes * (numParticipantes - 1)) / 2
          mensaje = `✅ Válido para todos contra todos. Se generarán ${partidosEstimados} partidos.`
        } else if (numParticipantes < 3) {
          mensaje = `❌ Se necesitan al menos 3 participantes. Actual: ${numParticipantes}`
        } else {
          mensaje = `⚠️ Demasiados participantes (${numParticipantes}). Máximo recomendado: 12`
        }
        break

      case "grupos":
        esValido = numParticipantes >= 6
        if (esValido) {
          const grupos = Math.ceil(numParticipantes / 4)
          partidosEstimados = Math.floor(((numParticipantes / grupos) * (numParticipantes / grupos - 1)) / 2) * grupos
          mensaje = `✅ Válido para fase de grupos. Se crearán ${grupos} grupos con ~${partidosEstimados} partidos.`
        } else {
          mensaje = `❌ Se necesitan al menos 6 participantes para formar grupos. Actual: ${numParticipantes}`
        }
        break

      default:
        esValido = numParticipantes >= 2
        partidosEstimados = Math.floor(numParticipantes / 2)
        mensaje = esValido
          ? `✅ Válido. Se generarán ${partidosEstimados} partidos.`
          : `❌ Se necesitan al menos 2 participantes. Actual: ${numParticipantes}`
    }

    return NextResponse.json({
      esValido,
      mensaje,
      numParticipantes,
      partidosEstimados,
    })
  } catch (error: any) {
    console.error("Error validando torneo:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
