import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const socioId = searchParams.get("socioId");
    const mes = searchParams.get("mes");
    const anio = searchParams.get("anio");
    const estado = searchParams.get("estado"); // 👈 nuevo

    let query = `
      SELECT 
        c.IdCuota,
        c.Mes,
        c.Anio,
        c.Monto,
        c.Estado,
        c.FechaVencimiento,
        c.FechaPago,
        c.Recargo,
        c.SocioId,
        CONCAT(p.Nombre, ' ', p.Apellido) as NombreSocio,
        p.Dni,
        CONCAT(
          CASE c.Mes
            WHEN 1 THEN 'Enero'
            WHEN 2 THEN 'Febrero'
            WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril'
            WHEN 5 THEN 'Mayo'
            WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio'
            WHEN 8 THEN 'Agosto'
            WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre'
            WHEN 11 THEN 'Noviembre'
            WHEN 12 THEN 'Diciembre'
          END,
          ' ', c.Anio
        ) as Periodo
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      INNER JOIN Personas p ON s.IdPersona = p.IdPersona
      WHERE 1=1
    `;

    const request_obj = await getConnection().then((pool) => pool.request());

    if (socioId) {
      query += " AND c.SocioId = @socioId";
      request_obj.input("socioId", sql.Int, Number.parseInt(socioId));
    }

    if (mes) {
      query += " AND c.Mes = @mes";
      request_obj.input("mes", sql.Int, Number.parseInt(mes));
    }

    if (anio) {
      query += " AND c.Anio = @anio";
      request_obj.input("anio", sql.Int, Number.parseInt(anio));
    }

    if (estado !== null) {
      query += " AND c.Estado = @estado";
      request_obj.input("estado", sql.Int, Number.parseInt(estado));
    }

    query += " ORDER BY c.Anio DESC, c.Mes DESC, p.Nombre ASC, p.Apellido ASC";

    const result = await request_obj.query(query);
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error obteniendo cuotas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
