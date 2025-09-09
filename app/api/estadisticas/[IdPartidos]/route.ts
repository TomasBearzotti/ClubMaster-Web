import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { IdPartidos: string } }
) {
  console.log("=== API Estadisticas GET ===");
  const partidoId = Number.parseInt(params.IdPartidos);
  console.log("partidoId:", partidoId);

  const pool = await getConnection();
  const result = await pool.request().input("IdPartido", sql.Int, partidoId)
    .query(`
      SELECT 
    ep.IdEstadistica,
    ep.ParticipanteId,
    COALESCE(
    e.Nombre, 
    CONCAT(per.Nombre, ' ', per.Apellido)
    ) as ParticipanteNombre,
    ep.NombreCampo,
    ep.Valor,
    ep.FechaRegistro
    FROM EstadisticasPartido ep
    INNER JOIN Participantes p ON ep.ParticipanteId = p.IdParticipante
    LEFT JOIN Equipos e ON p.EquipoId = e.IdEquipo
    LEFT JOIN Socios s ON p.SocioId = s.IdSocio
    LEFT JOIN Personas per ON s.IdPersona = per.IdPersona
    WHERE ep.PartidoId = @IdPartido
    ORDER BY ParticipanteNombre, ep.NombreCampo
    `);

  // console.log("Estadísticas encontradas:", result.recordset);
  return NextResponse.json(result.recordset);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { IdPartidos: string } }
) {
  console.log("=== API Estadisticas POST ===");
  console.log("partidoId:", params.IdPartidos);

  try {
    const partidoId = Number.parseInt(params.IdPartidos);
    const body = await request.json();
    console.log("Request body:", body);

    const { participanteId, estadisticas } = body;

    if (!participanteId || !estadisticas || !Array.isArray(estadisticas)) {
      console.error("Datos inválidos:", { participanteId, estadisticas });
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const pool = await getConnection();

    // Delete existing statistics for this participant in this match
    // CORREGIDO: usar PartidoId en lugar de IdPartido
    await pool
      .request()
      .input("IdPartido", sql.Int, partidoId)
      .input("participanteId", sql.Int, participanteId).query(`
        DELETE FROM EstadisticasPartido 
        WHERE PartidoId = @IdPartido AND ParticipanteId = @participanteId
      `);

    // Insert new statistics
    for (const estadistica of estadisticas) {
      if (estadistica.valor && estadistica.valor.trim() !== "") {
        // CORREGIDO: usar PartidoId en lugar de IdPartido
        await pool
          .request()
          .input("IdPartido", sql.Int, partidoId)
          .input("participanteId", sql.Int, participanteId)
          .input("nombreCampo", sql.NVarChar, estadistica.nombreCampo)
          .input("valor", sql.NVarChar, estadistica.valor).query(`
            INSERT INTO EstadisticasPartido (PartidoId, ParticipanteId, NombreCampo, Valor, FechaRegistro)
            VALUES (@IdPartido, @participanteId, @nombreCampo, @valor, GETDATE())
          `);
      }
    }

    await pool
      .request()
      .input("PartidoId", sql.Int, partidoId)
      .input("Estado", sql.NVarChar, "finalizado").query(`
    UPDATE Partidos
    SET EstadoPartido = @Estado
    WHERE IdPartido = @PartidoId
  `);

    console.log("Estadísticas guardadas exitosamente");

    return NextResponse.json({
      success: true,
      message: "Estadísticas guardadas exitosamente",
    });
  } catch (error) {
    console.error("Error saving estadisticas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
