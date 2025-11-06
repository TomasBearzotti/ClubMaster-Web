/**
 * API para obtener los fixtures de un torneo específico
 * GET /api/torneos/[id]/fixtures - Lista todos los fixtures del torneo
 */

import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const torneoId = Number.parseInt(params.id);

    if (isNaN(torneoId)) {
      return NextResponse.json(
        { error: "ID de torneo inválido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Obtener fixtures del torneo ordenados por NumeroRonda
    const fixturesResult = await pool
      .request()
      .input("torneoId", sql.Int, torneoId).query(`
        SELECT 
          f.IdFixture,
          f.Tipo,
          f.TorneoId,
          f.Nombre,
          f.NumeroRonda,
          f.Grupo,
          f.FechaInicio,
          f.FechaFin,
          COUNT(p.IdPartido) as TotalPartidos,
          SUM(CASE WHEN p.Estado = 0 THEN 1 ELSE 0 END) as PartidosProgramados,
          SUM(CASE WHEN p.Estado = 1 THEN 1 ELSE 0 END) as PartidosEnJuego,
          SUM(CASE WHEN p.Estado = 3 THEN 1 ELSE 0 END) as PartidosFinalizados
        FROM Fixtures f
        LEFT JOIN Partidos p ON f.IdFixture = p.FixtureIdFixture
        WHERE f.TorneoId = @torneoId
        GROUP BY f.IdFixture, f.Tipo, f.TorneoId, f.Nombre, f.NumeroRonda, f.Grupo, f.FechaInicio, f.FechaFin
        ORDER BY f.NumeroRonda ASC, f.Grupo ASC
      `);

    return NextResponse.json({
      torneoId,
      fixtures: fixturesResult.recordset,
      total: fixturesResult.recordset.length,
    });
  } catch (error) {
    console.error("Error obteniendo fixtures del torneo:", error);
    return NextResponse.json(
      { error: "Error al obtener fixtures del torneo" },
      { status: 500 }
    );
  }
}
