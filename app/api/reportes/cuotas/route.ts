import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fechaInicio = searchParams.get("fechaInicio")
  const fechaFin = searchParams.get("fechaFin")
  const estado = searchParams.get("estado")

  try {
    const pool = await getConnection()

    // Query principal para obtener cuotas con filtros
    let cuotasQuery = `
      SELECT 
        c.IdCuota,
        c.SocioId as IdSocio,
        s.IdSocio as NumeroSocio,
        p.Nombre as NombreSocio,
        p.Apellido as ApellidoSocio,
        p.Dni,
        c.Mes,
        c.Anio,
        c.Monto,
        c.Recargo,
        c.FechaVencimiento,
        c.FechaPago,
        c.Estado,
        c.MetodoPago,
        c.NumeroTransaccion,
        tm.Descripcion as TipoMembresia
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      INNER JOIN Personas p ON s.IdPersona = p.IdPersona
      INNER JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
      WHERE 1=1
    `

    const request1 = pool.request()

    if (fechaInicio && fechaFin) {
      cuotasQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      request1.input("FechaInicio", sql.Date, new Date(fechaInicio))
      request1.input("FechaFin", sql.Date, new Date(fechaFin))
    }

    if (estado && estado !== "todos") {
      const estadoMap: any = {
        pagada: 1,
        pendiente: 0,
        vencida: 0, // Se filtrará después
      }
      if (estado === "vencida") {
        cuotasQuery += ` AND c.Estado = 0 AND c.FechaVencimiento < GETDATE()`
      } else {
        cuotasQuery += ` AND c.Estado = @Estado`
        request1.input("Estado", sql.Int, estadoMap[estado])
      }
    }

    cuotasQuery += ` ORDER BY c.FechaVencimiento DESC`

    const cuotasResult = await request1.query(cuotasQuery)

    // Estadísticas generales
    const request2 = pool.request()
    let statsQuery = `
      SELECT 
        COUNT(*) as TotalCuotas,
        SUM(CASE WHEN c.Estado = 1 THEN 1 ELSE 0 END) as CuotasPagadas,
        SUM(CASE WHEN c.Estado = 0 THEN 1 ELSE 0 END) as CuotasPendientes,
        SUM(CASE WHEN c.Estado = 0 AND c.FechaVencimiento < GETDATE() THEN 1 ELSE 0 END) as CuotasVencidas,
        SUM(CASE WHEN c.Estado = 1 THEN c.Monto + ISNULL(c.Recargo, 0) ELSE 0 END) as MontoRecaudado,
        SUM(CASE WHEN c.Estado = 0 THEN c.Monto + ISNULL(c.Recargo, 0) ELSE 0 END) as MontoPendiente,
        SUM(ISNULL(c.Recargo, 0)) as TotalRecargos
      FROM Cuotas c
      WHERE 1=1
    `

    if (fechaInicio && fechaFin) {
      statsQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      request2.input("FechaInicio", sql.Date, new Date(fechaInicio))
      request2.input("FechaFin", sql.Date, new Date(fechaFin))
    }

    if (estado && estado !== "todos") {
      if (estado === "vencida") {
        statsQuery += ` AND c.Estado = 0 AND c.FechaVencimiento < GETDATE()`
      } else {
        const estadoMap: any = {
          pagada: 1,
          pendiente: 0,
        }
        statsQuery += ` AND c.Estado = @Estado`
        request2.input("Estado", sql.Int, estadoMap[estado])
      }
    }

    const statsResult = await request2.query(statsQuery)

    // Recaudación mensual
    let recaudacionQuery = `
      SELECT 
        FORMAT(DATEFROMPARTS(c.Anio, c.Mes, 1), 'yyyy-MM') as Mes,
        SUM(CASE WHEN c.Estado = 1 THEN c.Monto + ISNULL(c.Recargo, 0) ELSE 0 END) as MontoRecaudado,
        SUM(CASE WHEN c.Estado = 0 THEN c.Monto + ISNULL(c.Recargo, 0) ELSE 0 END) as MontoPendiente,
        COUNT(CASE WHEN c.Estado = 1 THEN 1 END) as CuotasPagadas,
        COUNT(CASE WHEN c.Estado = 0 THEN 1 END) as CuotasPendientes
      FROM Cuotas c
      WHERE 1=1
    `

    const request3 = pool.request()

    if (fechaInicio && fechaFin) {
      recaudacionQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      request3.input("FechaInicio", sql.Date, new Date(fechaInicio))
      request3.input("FechaFin", sql.Date, new Date(fechaFin))
    } else {
      recaudacionQuery += ` AND DATEFROMPARTS(c.Anio, c.Mes, 1) >= DATEADD(MONTH, -6, GETDATE())`
    }

    recaudacionQuery += ` GROUP BY c.Anio, c.Mes ORDER BY c.Anio, c.Mes`

    const recaudacionResult = await request3.query(recaudacionQuery)

    // Métodos de pago
    let metodosQuery = `
      SELECT 
        c.MetodoPago,
        COUNT(*) as Cantidad,
        SUM(c.Monto + ISNULL(c.Recargo, 0)) as MontoTotal
      FROM Cuotas c
      WHERE c.Estado = 1 AND c.MetodoPago IS NOT NULL
    `

    const request4 = pool.request()

    if (fechaInicio && fechaFin) {
      metodosQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      request4.input("FechaInicio", sql.Date, new Date(fechaInicio))
      request4.input("FechaFin", sql.Date, new Date(fechaFin))
    }

    metodosQuery += ` GROUP BY c.MetodoPago ORDER BY MontoTotal DESC`

    const metodosResult = await request4.query(metodosQuery)

    // Top 10 morosos
    let morososQuery = `
      SELECT TOP 10
        s.IdSocio as NumeroSocio,
        p.Nombre,
        p.Apellido,
        p.Dni,
        COUNT(*) as CuotasVencidas,
        SUM(c.Monto + ISNULL(c.Recargo, 0)) as DeudaTotal
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      INNER JOIN Personas p ON s.IdPersona = p.IdPersona
      WHERE c.Estado = 0 AND c.FechaVencimiento < GETDATE()
    `

    const request5 = pool.request()

    if (fechaInicio && fechaFin) {
      morososQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      request5.input("FechaInicio", sql.Date, new Date(fechaInicio))
      request5.input("FechaFin", sql.Date, new Date(fechaFin))
    }

    morososQuery += ` GROUP BY s.IdSocio, p.Nombre, p.Apellido, p.Dni ORDER BY DeudaTotal DESC`

    const morososResult = await request5.query(morososQuery)

    const stats = statsResult.recordset[0]
    const totalCuotas = stats.TotalCuotas || 0
    const pagadas = stats.CuotasPagadas || 0
    const pendientes = stats.CuotasPendientes || 0
    const vencidas = stats.CuotasVencidas || 0

    return NextResponse.json({
      cuotas: cuotasResult.recordset,
      estadisticas: {
        totalCuotas,
        pagadas,
        pendientes,
        vencidas,
        porcentajePagadas: totalCuotas > 0 ? (pagadas / totalCuotas) * 100 : 0,
        porcentajePendientes: totalCuotas > 0 ? (pendientes / totalCuotas) * 100 : 0,
        montoRecaudado: stats.MontoRecaudado || 0,
        montoPendiente: stats.MontoPendiente || 0,
        totalRecargos: stats.TotalRecargos || 0,
        porMes: recaudacionResult.recordset.map((r: any) => ({
          mes: r.Mes,
          pagadas: r.CuotasPagadas || 0,
          pendientes: r.CuotasPendientes || 0,
          montoRecaudado: r.MontoRecaudado || 0,
          montoPendiente: r.MontoPendiente || 0,
        })),
      },
      metodosPago: metodosResult.recordset,
      morosos: morososResult.recordset,
    })
  } catch (error: any) {
    console.error("Error al obtener reporte de cuotas:", error)
    return NextResponse.json({ error: "Error al obtener reporte de cuotas", details: error.message }, { status: 500 })
  }
}
