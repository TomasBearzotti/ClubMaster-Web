import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { IdPartidos: string } }
) {
  const partidoId = Number.parseInt(params.IdPartidos);

  const pool = await getConnection();
  const result = await pool.request().input("partidoId", sql.Int, partidoId)
    .query(`
    SELECT 
      ep.IdEstadistica,
      ep.PartidoId,
      ep.ParticipanteId,
      COALESCE(e.Nombre, CONCAT(per.Nombre, ' ', per.Apellido)) AS ParticipanteNombre,
      pe.NombreCampo,
      ep.IdPlantilla,
      ep.Valor,
      ep.FechaRegistro
    FROM EstadisticasPartido ep
    INNER JOIN PlantillasEstadisticas pe ON ep.IdPlantilla = pe.IdPlantilla
    LEFT JOIN Participantes part ON ep.ParticipanteId = part.IdParticipante
    LEFT JOIN Equipos e ON part.EquipoId = e.IdEquipo
    LEFT JOIN Socios s ON part.SocioId = s.IdSocio
    LEFT JOIN Personas per ON s.IdPersona = per.IdPersona
    WHERE ep.PartidoId = @partidoId
    ORDER BY pe.Orden, ep.ParticipanteId
  `);

  // console.log("Estadísticas encontradas:", result.recordset);
  return NextResponse.json(result.recordset);
}
