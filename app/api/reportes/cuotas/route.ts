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
        s.IdSocio,
        p.Nombre,
        p.Apellido,
        p.Dni,
        c.Mes,
        c.Anio,
        c.Monto,
        c.Recargo,
        c.FechaVencimiento,
        c.FechaPago,
        c.Estado,
        c.MetodoPago,
        tm.Nombre as TipoMembresia
      FROM Cuotas c
      INNER JOIN Socios s ON c.IdSocio = s.IdSocio
      INNER JOIN Personas p ON s.IdPersona = p.IdPersona
      INNER JOIN TiposMembresia tm ON s.IdTipoMembresia = tm.IdTipoMembresia
      WHERE 1=1
    `

    const params: any[] = []

    if (fechaInicio && fechaFin) {
      cuotasQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      params.push(
        { name: "FechaInicio", type: sql.Date, value: new Date(fechaInicio) },
        { name: "FechaFin", type: sql.Date, value: new Date(fechaFin) }
      )
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
        params.push({ name: "Estado", type: sql.Int, value: estadoMap[estado] })
      }
    }

    cuotasQuery += ` ORDER BY c.FechaVencimiento DESC`

    const request1 = pool.request()
    params.forEach((param) => {
      request1.input(param.name, param.type, param.value)
    })
    const cuotasResult = await request1.query(cuotasQuery)

    // Estadísticas generales
    let statsQuery = `
      SELECT 
        COUNT(*) as TotalCuotas,
        SUM(CASE WHEN c.Estado = 1 THEN 1 ELSE 0 END) as CuotasPagadas,
        SUM(CASE WHEN c.Estado = 0 THEN 1 ELSE 0 END) as CuotasPendientes,
        SUM(CASE WHEN c.Estado = 0 AND c.FechaVencimiento < GETDATE() THEN 1 ELSE 0 END) as CuotasVencidas,
        SUM(CASE WHEN c.Estado = 1 THEN c.Monto + c.Recargo ELSE 0 END) as MontoRecaudado,
        SUM(CASE WHEN c.Estado = 0 THEN c.Monto + c.Recargo ELSE 0 END) as MontoPendiente,
        SUM(c.Recargo) as TotalRecargos
      FROM Cuotas c
      WHERE 1=1
    `

    if (fechaInicio && fechaFin) {
      statsQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
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
      }
    }

    const request2 = pool.request()
    params.forEach((param) => {
      request2.input(param.name, param.type, param.value)
    })
    const statsResult = await request2.query(statsQuery)

    // Recaudación mensual
    let recaudacionQuery = `
      SELECT 
        FORMAT(DATEFROMPARTS(c.Anio, c.Mes, 1), 'yyyy-MM') as Mes,
        SUM(CASE WHEN c.Estado = 1 THEN c.Monto + c.Recargo ELSE 0 END) as MontoRecaudado,
        SUM(CASE WHEN c.Estado = 0 THEN c.Monto + c.Recargo ELSE 0 END) as MontoPendiente,
        COUNT(CASE WHEN c.Estado = 1 THEN 1 END) as CuotasPagadas,
        COUNT(CASE WHEN c.Estado = 0 THEN 1 END) as CuotasPendientes
      FROM Cuotas c
      WHERE 1=1
    `

    if (fechaInicio && fechaFin) {
      recaudacionQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
    } else {
      recaudacionQuery += ` AND DATEFROMPARTS(c.Anio, c.Mes, 1) >= DATEADD(MONTH, -6, GETDATE())`
    }

    recaudacionQuery += ` GROUP BY c.Anio, c.Mes ORDER BY c.Anio, c.Mes`

    const request3 = pool.request()
    params.forEach((param) => {
      request3.input(param.name, param.type, param.value)
    })
    const recaudacionResult = await request3.query(recaudacionQuery)

    // Métodos de pago
    let metodosQuery = `
      SELECT 
        c.MetodoPago,
        COUNT(*) as Cantidad,
        SUM(c.Monto + c.Recargo) as MontoTotal
      FROM Cuotas c
      WHERE c.Estado = 1 AND c.MetodoPago IS NOT NULL
    `

    if (fechaInicio && fechaFin) {
      metodosQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
    }

    metodosQuery += ` GROUP BY c.MetodoPago ORDER BY MontoTotal DESC`

    const request4 = pool.request()
    params.forEach((param) => {
      request4.input(param.name, param.type, param.value)
    })
    const metodosResult = await request4.query(metodosQuery)

    // Top 10 morosos
    let morososQuery = `
      SELECT TOP 10
        s.IdSocio,
        p.Nombre,
        p.Apellido,
        p.Dni,
        COUNT(*) as CuotasVencidas,
        SUM(c.Monto + c.Recargo) as DeudaTotal
      FROM Cuotas c
      INNER JOIN Socios s ON c.IdSocio = s.IdSocio
      INNER JOIN Personas p ON s.IdPersona = p.IdPersona
      WHERE c.Estado = 0 AND c.FechaVencimiento < GETDATE()
    `

    if (fechaInicio && fechaFin) {
      morososQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
    }

    morososQuery += ` GROUP BY s.IdSocio, p.Nombre, p.Apellido, p.Dni ORDER BY DeudaTotal DESC`

    const request5 = pool.request()
    params.forEach((param) => {
      request5.input(param.name, param.type, param.value)
    })
    const morososResult = await request5.query(morososQuery)

    return NextResponse.json({
      cuotas: cuotasResult.recordset,
      estadisticas: statsResult.recordset[0],
      recaudacion: recaudacionResult.recordset,
      metodosPago: metodosResult.recordset,
      morosos: morososResult.recordset,
    })
  } catch (error: any) {
    console.error("Error al obtener reporte de cuotas:", error)
    return NextResponse.json({ error: "Error al obtener reporte de cuotas", details: error.message }, { status: 500 })
  }
}
