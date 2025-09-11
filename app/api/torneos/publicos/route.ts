import { NextResponse } from "next/server";
import { getConnection } from "@/lib/sql-server";

export async function GET() {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT 
        t.IdTorneo,
        t.Nombre,
        t.IdDeporte,
        d.Nombre AS NombreDeporte,
        t.FechaInicio,
        t.Estado,
        t.Descripcion,
        t.MaxParticipantes,
        t.FechaFin,
        t.PremioGanador,
        COUNT(p.IdParticipante) AS ParticipantesActuales
      FROM Torneos t
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      LEFT JOIN Participantes p ON t.IdTorneo = p.TorneoId
      WHERE t.Estado IN (0, 1)  -- pendientes y activos
      GROUP BY 
        t.IdTorneo, t.Nombre, t.IdDeporte, d.Nombre,
        t.FechaInicio, t.Estado, t.Descripcion, t.MaxParticipantes,
        t.FechaFin, t.PremioGanador
      ORDER BY t.FechaInicio DESC
    `);

    return NextResponse.json(result.recordset);
  } catch (error: any) {
    console.error("❌ Error fetching torneos publicos:", error);
    return NextResponse.json(
      { error: "Error al obtener torneos públicos", details: error.message },
      { status: 500 }
    );
  }
}
