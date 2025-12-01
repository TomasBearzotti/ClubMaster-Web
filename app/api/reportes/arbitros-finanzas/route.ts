import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

// Tarifa por defecto si el árbitro no tiene configurada
const TARIFA_DEFECTO = 50000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")
    const deporte = searchParams.get("deporte")

    const pool = await getConnection()

    // Query para obtener árbitros con sus partidos y calcular pagos
    let arbitrosQuery = `
      SELECT 
        a.IdArbitro,
        a.Estado,
        a.Tarifa,
        p.Nombre,
        p.Apellido,
        p.Dni,
        p.Mail,
        COUNT(part.IdPartido) as TotalPartidos,
        COUNT(CASE WHEN part.EstadoPartido = 'Finalizado' THEN 1 END) as PartidosFinalizados,
        COUNT(CASE WHEN part.EstadoPartido = 'Programado' OR part.EstadoPartido IS NULL THEN 1 END) as PartidosProgramados
      FROM Arbitros a
      INNER JOIN Personas p ON a.IdPersona = p.IdPersona
      LEFT JOIN Partidos part ON a.IdArbitro = part.ArbitroId
      WHERE a.Estado = 1
    `

    const request1 = pool.request()

    if (fechaInicio && fechaFin) {
      arbitrosQuery += ` AND part.FechaPartido BETWEEN @fechaInicio AND @fechaFin`
      request1.input("fechaInicio", sql.Date, fechaInicio)
      request1.input("fechaFin", sql.Date, fechaFin)
    }

    if (deporte && deporte !== "todos") {
      arbitrosQuery += ` AND part.TorneoId IN (SELECT IdTorneo FROM Torneos WHERE IdDeporte = @deporte)`
      request1.input("deporte", sql.Int, parseInt(deporte))
    }

    arbitrosQuery += `
      GROUP BY a.IdArbitro, a.Estado, a.Tarifa, p.Nombre, p.Apellido, p.Dni, p.Mail
      HAVING COUNT(part.IdPartido) > 0
      ORDER BY TotalPartidos DESC
    `

    const arbitrosResult = await request1.query(arbitrosQuery)

    // Query para obtener distribución por deporte con tarifas individuales
    let deporteQuery = `
      SELECT 
        d.Nombre as DeporteNombre,
        COUNT(part.IdPartido) as TotalPartidos,
        COUNT(CASE WHEN part.EstadoPartido = 'Finalizado' THEN 1 END) as PartidosFinalizados,
        SUM(CASE 
          WHEN part.EstadoPartido = 'Finalizado' THEN ISNULL(a.Tarifa, @tarifaDefecto)
          ELSE 0 
        END) as TotalGasto,
        SUM(CASE 
          WHEN part.EstadoPartido = 'Programado' OR part.EstadoPartido IS NULL THEN ISNULL(a.Tarifa, @tarifaDefecto)
          ELSE 0 
        END) as TotalPendiente
      FROM Partidos part
      INNER JOIN Torneos t ON part.TorneoId = t.IdTorneo
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      LEFT JOIN Arbitros a ON part.ArbitroId = a.IdArbitro
      WHERE part.ArbitroId IS NOT NULL
    `

    const request2 = pool.request()
    request2.input("tarifaDefecto", sql.Decimal(10, 2), TARIFA_DEFECTO)

    if (fechaInicio && fechaFin) {
      deporteQuery += ` AND part.FechaPartido BETWEEN @fechaInicio AND @fechaFin`
      request2.input("fechaInicio", sql.Date, fechaInicio)
      request2.input("fechaFin", sql.Date, fechaFin)
    }

    if (deporte && deporte !== "todos") {
      deporteQuery += ` AND d.IdDeporte = @deporte`
      request2.input("deporte", sql.Int, parseInt(deporte))
    }

    deporteQuery += ` GROUP BY d.Nombre`

    const deporteResult = await request2.query(deporteQuery)

    // Calcular gastos usando la tarifa individual de cada árbitro
    const arbitrosConPagos = arbitrosResult.recordset.map((a: any) => {
      const tarifaArbitro = a.Tarifa || TARIFA_DEFECTO
      return {
        ...a,
        TarifaArbitro: tarifaArbitro,
        MontoPagado: a.PartidosFinalizados * tarifaArbitro,
        MontoPendiente: a.PartidosProgramados * tarifaArbitro,
        MontoTotal: a.TotalPartidos * tarifaArbitro,
      }
    })

    // Estadísticas financieras usando tarifas individuales
    const totalArbitros = arbitrosResult.recordset.length
    const totalPartidos = arbitrosConPagos.reduce((acc: number, a: any) => acc + a.TotalPartidos, 0)
    const partidosFinalizados = arbitrosConPagos.reduce(
      (acc: number, a: any) => acc + a.PartidosFinalizados,
      0
    )
    const partidosProgramados = arbitrosConPagos.reduce(
      (acc: number, a: any) => acc + a.PartidosProgramados,
      0
    )

    const montoPagado = arbitrosConPagos.reduce((acc: number, a: any) => acc + a.MontoPagado, 0)
    const montoPendiente = arbitrosConPagos.reduce((acc: number, a: any) => acc + a.MontoPendiente, 0)
    const montoTotal = arbitrosConPagos.reduce((acc: number, a: any) => acc + a.MontoTotal, 0)

    // Porcentaje pagado
    const porcentajePagado = montoTotal > 0 ? ((montoPagado / montoTotal) * 100).toFixed(1) : "0"

    // Tarifa promedio
    const tarifaPromedio = totalArbitros > 0 
      ? arbitrosConPagos.reduce((acc: number, a: any) => acc + a.TarifaArbitro, 0) / totalArbitros 
      : TARIFA_DEFECTO

    // Distribución por deporte
    const porDeporte = deporteResult.recordset.map((d: any) => ({
      name: d.DeporteNombre,
      partidos: d.TotalPartidos,
      gasto: parseFloat(d.TotalGasto || 0),
      pendiente: parseFloat(d.TotalPendiente || 0),
      value: parseFloat(d.TotalGasto || 0), // Para gráfico
    }))

    // Top árbitros por gasto
    const topArbitrosPorGasto = arbitrosConPagos
      .sort((a: any, b: any) => b.MontoTotal - a.MontoTotal)
      .slice(0, 10)
      .map((a: any) => ({
        name: `${a.Nombre} ${a.Apellido}`,
        value: a.MontoTotal,
        partidos: a.TotalPartidos,
      }))

    // Distribución de pagos
    const distribucionPagos = [
      { name: "Pagado", value: montoPagado, color: "#10b981" },
      { name: "Pendiente", value: montoPendiente, color: "#f59e0b" },
    ].filter((item) => item.value > 0)

    const estadisticas = {
      totalArbitros,
      totalPartidos,
      partidosFinalizados,
      partidosProgramados,
      montoPagado: montoPagado.toFixed(2),
      montoPendiente: montoPendiente.toFixed(2),
      montoTotal: montoTotal.toFixed(2),
      porcentajePagado: parseFloat(porcentajePagado),
      tarifaPromedio: tarifaPromedio.toFixed(2),
      porDeporte,
      topArbitrosPorGasto,
      distribucionPagos,
    }

    return NextResponse.json({
      arbitros: arbitrosConPagos,
      estadisticas,
    })
  } catch (error: any) {
    console.error("Error en reporte financiero de árbitros:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte", details: error.message },
      { status: 500 }
    )
  }
}
