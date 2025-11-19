import { NextResponse } from "next/server";
import { getConnection } from "@/lib/sql-server";

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        IdDisponibilidad,
        IdArbitro,
        DiaSemana,
        CONVERT(VARCHAR(5), HoraInicio, 108) as HoraInicio,
        CONVERT(VARCHAR(5), HoraFin, 108) as HoraFin
      FROM DisponibilidadArbitro
      ORDER BY IdArbitro, 
        CASE DiaSemana
          WHEN 'Lunes' THEN 1
          WHEN 'Martes' THEN 2
          WHEN 'Miercoles' THEN 3
          WHEN 'Jueves' THEN 4
          WHEN 'Viernes' THEN 5
          WHEN 'Sabado' THEN 6
          WHEN 'Domingo' THEN 7
        END
    `);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error fetching disponibilidad:", error);
    return NextResponse.json(
      { error: "Error al obtener disponibilidad" },
      { status: 500 }
    );
  }
}
