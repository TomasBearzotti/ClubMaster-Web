import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

/**
 * GET /api/cuotas/estadisticas
 * Obtiene estadísticas agregadas de cuotas por mes/año
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anio = searchParams.get("anio");

    const pool = await getConnection();

    // Estadísticas generales del año actual o especificado
    const currentYear = anio ? Number.parseInt(anio) : new Date().getFullYear();

    // Obtener estadísticas mensuales
    const mensualResult = await pool
      .request()
      .input("anio", sql.Int, currentYear)
      .query(`
        SELECT 
          c.Mes,
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
          END as NombreMes,
          COUNT(*) as TotalCuotas,
          SUM(CASE WHEN c.Estado = 1 THEN 1 ELSE 0 END) as CuotasPagadas,
          SUM(CASE WHEN c.Estado = 0 THEN 1 ELSE 0 END) as CuotasPendientes,
          SUM(c.Monto) as MontoTotal,
          SUM(CASE WHEN c.Estado = 1 THEN c.Monto ELSE 0 END) as MontoRecaudado,
          SUM(CASE WHEN c.Estado = 0 THEN c.Monto ELSE 0 END) as MontoPendiente,
          SUM(ISNULL(c.Recargo, 0)) as TotalRecargos
        FROM Cuotas c
        WHERE c.Anio = @anio
        GROUP BY c.Mes
        ORDER BY c.Mes
      `);

    // Obtener estadísticas totales del año
    const totalResult = await pool
      .request()
      .input("anio", sql.Int, currentYear)
      .query(`
        SELECT 
          COUNT(*) as TotalCuotas,
          SUM(CASE WHEN c.Estado = 1 THEN 1 ELSE 0 END) as CuotasPagadas,
          SUM(CASE WHEN c.Estado = 0 THEN 1 ELSE 0 END) as CuotasPendientes,
          SUM(c.Monto) as MontoTotal,
          SUM(CASE WHEN c.Estado = 1 THEN c.Monto ELSE 0 END) as MontoRecaudado,
          SUM(CASE WHEN c.Estado = 0 THEN c.Monto ELSE 0 END) as MontoPendiente,
          SUM(ISNULL(c.Recargo, 0)) as TotalRecargos,
          CAST(
            CASE 
              WHEN COUNT(*) > 0 
              THEN (SUM(CASE WHEN c.Estado = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
              ELSE 0 
            END 
          AS DECIMAL(5,2)) as PorcentajePagadas
        FROM Cuotas c
        WHERE c.Anio = @anio
      `);

    // Obtener top socios con más deuda
    const morososResult = await pool
      .request()
      .input("anio", sql.Int, currentYear)
      .query(`
        SELECT TOP 10
          s.IdSocio,
          CONCAT(p.Nombre, ' ', p.Apellido) as NombreSocio,
          COUNT(*) as CuotasAtrasadas,
          SUM(c.Monto + ISNULL(c.Recargo, 0)) as DeudaTotal
        FROM Cuotas c
        INNER JOIN Socios s ON c.SocioId = s.IdSocio
        INNER JOIN Personas p ON s.IdPersona = p.IdPersona
        WHERE c.Estado = 0 
          AND c.FechaVencimiento < GETDATE()
        GROUP BY s.IdSocio, p.Nombre, p.Apellido
        ORDER BY DeudaTotal DESC
      `);

    return NextResponse.json({
      anio: currentYear,
      mensual: mensualResult.recordset,
      totales: totalResult.recordset[0] || {
        TotalCuotas: 0,
        CuotasPagadas: 0,
        CuotasPendientes: 0,
        MontoTotal: 0,
        MontoRecaudado: 0,
        MontoPendiente: 0,
        TotalRecargos: 0,
        PorcentajePagadas: 0,
      },
      morosos: morososResult.recordset,
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas de cuotas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
