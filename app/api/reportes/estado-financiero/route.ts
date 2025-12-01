import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

const TARIFA_DEFECTO = 50000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")
    const tipoMembresia = searchParams.get("tipoMembresia")

    const pool = await getConnection()

    // ========== INGRESOS: Cuotas de Socios ==========
    let ingresosQuery = `
      SELECT 
        YEAR(c.FechaPago) as Anio,
        MONTH(c.FechaPago) as Mes,
        COUNT(c.IdCuota) as TotalCuotas,
        SUM(c.Monto) as MontoBase,
        SUM(ISNULL(c.Recargo, 0)) as MontoRecargos,
        SUM(c.Monto + ISNULL(c.Recargo, 0)) as MontoTotal
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      WHERE c.Estado = 1
        AND c.FechaPago IS NOT NULL
    `

    const request1 = pool.request()

    if (fechaInicio && fechaFin) {
      ingresosQuery += ` AND c.FechaPago BETWEEN @fechaInicio AND @fechaFin`
      request1.input("fechaInicio", sql.Date, fechaInicio)
      request1.input("fechaFin", sql.Date, fechaFin)
    }

    if (tipoMembresia && tipoMembresia !== "todos") {
      ingresosQuery += ` AND s.TipoMembresiaId = @tipoMembresia`
      request1.input("tipoMembresia", sql.Int, parseInt(tipoMembresia))
    }

    ingresosQuery += `
      GROUP BY YEAR(c.FechaPago), MONTH(c.FechaPago)
      ORDER BY Anio, Mes
    `

    const ingresosResult = await request1.query(ingresosQuery)

    // ========== INGRESOS TOTALES (Sin filtro de fecha para comparar) ==========
    let ingresosTotalesQuery = `
      SELECT 
        COUNT(c.IdCuota) as TotalCuotasPagadas,
        SUM(c.Monto + ISNULL(c.Recargo, 0)) as IngresoTotal,
        AVG(c.Monto + ISNULL(c.Recargo, 0)) as PromedioIngreso
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      WHERE c.Estado = 1 AND c.FechaPago IS NOT NULL
    `

    const request2 = pool.request()

    if (fechaInicio && fechaFin) {
      ingresosTotalesQuery += ` AND c.FechaPago BETWEEN @fechaInicio AND @fechaFin`
      request2.input("fechaInicio", sql.Date, fechaInicio)
      request2.input("fechaFin", sql.Date, fechaFin)
    }

    if (tipoMembresia && tipoMembresia !== "todos") {
      ingresosTotalesQuery += ` AND s.TipoMembresiaId = @tipoMembresia`
      request2.input("tipoMembresia", sql.Int, parseInt(tipoMembresia))
    }

    const ingresosTotalesResult = await request2.query(ingresosTotalesQuery)

    // ========== INGRESOS POR TIPO DE MEMBRESÍA ==========
    let ingresosPorTipoQuery = `
      SELECT 
        tm.Descripcion as TipoMembresia,
        COUNT(c.IdCuota) as TotalCuotas,
        SUM(c.Monto + ISNULL(c.Recargo, 0)) as MontoTotal
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      INNER JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
      WHERE c.Estado = 1 AND c.FechaPago IS NOT NULL
    `

    const request3 = pool.request()

    if (fechaInicio && fechaFin) {
      ingresosPorTipoQuery += ` AND c.FechaPago BETWEEN @fechaInicio AND @fechaFin`
      request3.input("fechaInicio", sql.Date, fechaInicio)
      request3.input("fechaFin", sql.Date, fechaFin)
    }

    if (tipoMembresia && tipoMembresia !== "todos") {
      ingresosPorTipoQuery += ` AND s.TipoMembresiaId = @tipoMembresia`
      request3.input("tipoMembresia", sql.Int, parseInt(tipoMembresia))
    }

    ingresosPorTipoQuery += `
      GROUP BY tm.Descripcion
      ORDER BY MontoTotal DESC
    `

    const ingresosPorTipoResult = await request3.query(ingresosPorTipoQuery)

    // ========== EGRESOS: Pagos a Árbitros ==========
    let egresosQuery = `
      SELECT 
        YEAR(part.FechaPartido) as Anio,
        MONTH(part.FechaPartido) as Mes,
        COUNT(part.IdPartido) as TotalPartidos,
        SUM(ISNULL(a.Tarifa, @tarifaDefecto)) as MontoTotal
      FROM Partidos part
      INNER JOIN Arbitros a ON part.ArbitroId = a.IdArbitro
      WHERE part.EstadoPartido = 'Finalizado'
    `

    const request4 = pool.request()
    request4.input("tarifaDefecto", sql.Decimal(10, 2), TARIFA_DEFECTO)

    if (fechaInicio && fechaFin) {
      egresosQuery += ` AND part.FechaPartido BETWEEN @fechaInicio AND @fechaFin`
      request4.input("fechaInicio", sql.Date, fechaInicio)
      request4.input("fechaFin", sql.Date, fechaFin)
    }

    egresosQuery += `
      GROUP BY YEAR(part.FechaPartido), MONTH(part.FechaPartido)
      ORDER BY Anio, Mes
    `

    const egresosResult = await request4.query(egresosQuery)

    // ========== EGRESOS TOTALES ==========
    let egresosTotalesQuery = `
      SELECT 
        COUNT(part.IdPartido) as TotalPartidosFinalizados,
        SUM(ISNULL(a.Tarifa, @tarifaDefecto)) as EgresoTotal,
        AVG(ISNULL(a.Tarifa, @tarifaDefecto)) as PromedioEgreso
      FROM Partidos part
      INNER JOIN Arbitros a ON part.ArbitroId = a.IdArbitro
      WHERE part.EstadoPartido = 'Finalizado'
    `

    const request5 = pool.request()
    request5.input("tarifaDefecto", sql.Decimal(10, 2), TARIFA_DEFECTO)

    if (fechaInicio && fechaFin) {
      egresosTotalesQuery += ` AND part.FechaPartido BETWEEN @fechaInicio AND @fechaFin`
      request5.input("fechaInicio", sql.Date, fechaInicio)
      request5.input("fechaFin", sql.Date, fechaFin)
    }

    const egresosTotalesResult = await request5.query(egresosTotalesQuery)

    // ========== EGRESOS POR DEPORTE ==========
    let egresosPorDeporteQuery = `
      SELECT 
        d.Nombre as Deporte,
        COUNT(part.IdPartido) as TotalPartidos,
        SUM(ISNULL(a.Tarifa, @tarifaDefecto)) as MontoTotal
      FROM Partidos part
      INNER JOIN Arbitros a ON part.ArbitroId = a.IdArbitro
      INNER JOIN Torneos t ON part.TorneoId = t.IdTorneo
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      WHERE part.EstadoPartido = 'Finalizado'
    `

    const request6 = pool.request()
    request6.input("tarifaDefecto", sql.Decimal(10, 2), TARIFA_DEFECTO)

    if (fechaInicio && fechaFin) {
      egresosPorDeporteQuery += ` AND part.FechaPartido BETWEEN @fechaInicio AND @fechaFin`
      request6.input("fechaInicio", sql.Date, fechaInicio)
      request6.input("fechaFin", sql.Date, fechaFin)
    }

    egresosPorDeporteQuery += `
      GROUP BY d.Nombre
      ORDER BY MontoTotal DESC
    `

    const egresosPorDeporteResult = await request6.query(egresosPorDeporteQuery)

    // ========== PROCESAR DATOS ==========

    // Datos de ingresos
    const ingresosData = ingresosResult.recordset
    const ingresosTotales = ingresosTotalesResult.recordset[0] || {
      TotalCuotasPagadas: 0,
      IngresoTotal: 0,
      PromedioIngreso: 0,
    }

    // Datos de egresos
    const egresosData = egresosResult.recordset
    const egresosTotales = egresosTotalesResult.recordset[0] || {
      TotalPartidosFinalizados: 0,
      EgresoTotal: 0,
      PromedioEgreso: 0,
    }

    // Calcular balance
    const totalIngresos = parseFloat(ingresosTotales.IngresoTotal || 0)
    const totalEgresos = parseFloat(egresosTotales.EgresoTotal || 0)
    const balance = totalIngresos - totalEgresos
    const margenPorcentaje = totalIngresos > 0 ? ((balance / totalIngresos) * 100) : 0

    // Evolución mensual (combinar ingresos y egresos por mes)
    const mesesMap = new Map()

    ingresosData.forEach((ing: any) => {
      const key = `${ing.Anio}-${ing.Mes}`
      mesesMap.set(key, {
        anio: ing.Anio,
        mes: ing.Mes,
        ingresos: parseFloat(ing.MontoTotal || 0),
        egresos: 0,
      })
    })

    egresosData.forEach((egr: any) => {
      const key = `${egr.Anio}-${egr.Mes}`
      if (mesesMap.has(key)) {
        mesesMap.get(key).egresos = parseFloat(egr.MontoTotal || 0)
      } else {
        mesesMap.set(key, {
          anio: egr.Anio,
          mes: egr.Mes,
          ingresos: 0,
          egresos: parseFloat(egr.MontoTotal || 0),
        })
      }
    })

    const evolucionMensual = Array.from(mesesMap.values())
      .sort((a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio
        return a.mes - b.mes
      })
      .map((item) => ({
        name: `${item.mes}/${item.anio}`,
        ingresos: item.ingresos,
        egresos: item.egresos,
        balance: item.ingresos - item.egresos,
      }))

    // Distribución de ingresos por tipo de membresía
    const ingresosPorTipo = ingresosPorTipoResult.recordset.map((item: any) => ({
      name: item.TipoMembresia,
      value: parseFloat(item.MontoTotal || 0),
      cuotas: item.TotalCuotas,
    }))

    // Distribución de egresos por deporte
    const egresosPorDeporte = egresosPorDeporteResult.recordset.map((item: any) => ({
      name: item.Deporte,
      value: parseFloat(item.MontoTotal || 0),
      partidos: item.TotalPartidos,
    }))

    // Comparación Ingresos vs Egresos
    const comparacionGeneral = [
      { name: "Ingresos", value: totalIngresos, color: "#10b981" },
      { name: "Egresos", value: totalEgresos, color: "#ef4444" },
    ]

    const estadisticas = {
      // Ingresos
      totalIngresos: totalIngresos.toFixed(2),
      totalCuotasPagadas: ingresosTotales.TotalCuotasPagadas || 0,
      promedioIngreso: parseFloat(ingresosTotales.PromedioIngreso || 0).toFixed(2),

      // Egresos
      totalEgresos: totalEgresos.toFixed(2),
      totalPartidosFinalizados: egresosTotales.TotalPartidosFinalizados || 0,
      promedioEgreso: parseFloat(egresosTotales.PromedioEgreso || 0).toFixed(2),

      // Balance
      balance: balance.toFixed(2),
      margenPorcentaje: margenPorcentaje.toFixed(1),
      estado: balance >= 0 ? "Positivo" : "Negativo",

      // Gráficos
      evolucionMensual,
      ingresosPorTipo,
      egresosPorDeporte,
      comparacionGeneral,
    }

    return NextResponse.json({
      estadisticas,
    })
  } catch (error: any) {
    console.error("Error en reporte de estado financiero:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte", details: error.message },
      { status: 500 }
    )
  }
}
