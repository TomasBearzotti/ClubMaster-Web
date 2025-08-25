import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const socioId = searchParams.get("socioId")
    const mes = searchParams.get("mes")
    const anio = searchParams.get("anio")

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
        s.Nombre as NombreSocio,
        s.Dni,
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
      WHERE 1=1
    `

    const request_obj = await getConnection().then((pool) => pool.request())

    if (socioId) {
      query += " AND c.SocioId = @socioId"
      request_obj.input("socioId", sql.Int, Number.parseInt(socioId))
    }

    if (mes) {
      query += " AND c.Mes = @mes"
      request_obj.input("mes", sql.Int, Number.parseInt(mes))
    }

    if (anio) {
      query += " AND c.Anio = @anio"
      request_obj.input("anio", sql.Int, Number.parseInt(anio))
    }

    query += " ORDER BY c.Anio DESC, c.Mes DESC, s.Nombre ASC"

    const result = await request_obj.query(query)
    return NextResponse.json(result.recordset)
  } catch (error) {
    console.error("Error obteniendo cuotas:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
