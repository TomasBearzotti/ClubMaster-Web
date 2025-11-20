import { NextResponse } from "next/server";
import { getConnection } from "@/lib/sql-server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const arbitroId = searchParams.get("arbitroId");

    const pool = await getConnection();
    let query = `
      SELECT 
        IdDisponibilidad,
        IdArbitro,
        DiaSemana,
        CONVERT(VARCHAR(5), HoraInicio, 108) as HoraInicio,
        CONVERT(VARCHAR(5), HoraFin, 108) as HoraFin
      FROM DisponibilidadArbitro
    `;

    if (arbitroId) {
      query += ` WHERE IdArbitro = ${arbitroId}`;
    }

    query += `
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
    `;

    const result = await pool.request().query(query);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error fetching disponibilidad:", error);
    return NextResponse.json(
      { error: "Error al obtener disponibilidad" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { arbitroId, disponibilidad } = body;

    if (!arbitroId) {
      return NextResponse.json(
        { error: "arbitroId es requerido" },
        { status: 400 }
      );
    }

    if (!Array.isArray(disponibilidad)) {
      return NextResponse.json(
        { error: "disponibilidad debe ser un array" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Eliminar disponibilidad existente del árbitro
    await pool.request().query(`
      DELETE FROM DisponibilidadArbitro
      WHERE IdArbitro = ${arbitroId}
    `);

    // Insertar nueva disponibilidad
    for (const slot of disponibilidad) {
      const { DiaSemana, HoraInicio, HoraFin } = slot;

      if (!DiaSemana || !HoraInicio || !HoraFin) {
        continue; // Saltar slots incompletos
      }

      await pool.request().query(`
        INSERT INTO DisponibilidadArbitro (IdArbitro, DiaSemana, HoraInicio, HoraFin)
        VALUES (${arbitroId}, '${DiaSemana}', '${HoraInicio}', '${HoraFin}')
      `);
    }

    return NextResponse.json({
      message: "Disponibilidad actualizada correctamente",
      count: disponibilidad.length,
    });
  } catch (error) {
    console.error("Error updating disponibilidad:", error);
    return NextResponse.json(
      { error: "Error al actualizar disponibilidad" },
      { status: 500 }
    );
  }
}
