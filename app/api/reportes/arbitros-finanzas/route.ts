import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

// Tarifa estimada por partido (puede configurarse)
const TARIFA_BASE_PARTIDO = 5000

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
      GROUP BY a.IdArbitro, a.Estado, p.Nombre, p.Apellido, p.Dni, p.Mail
      HAVING COUNT(part.IdPartido) > 0
      ORDER BY TotalPartidos DESC
    `

    const arbitrosResult = await request1.query(arbitrosQuery)

    // Query para obtener distribución por deporte
    let deporteQuery = `
      SELECT 
        d.Nombre as DeporteNombre,
        COUNT(part.IdPartido) as TotalPartidos,
        COUNT(CASE WHEN part.EstadoPartido = 'Finalizado' THEN 1 END) as PartidosFinalizados
      FROM Partidos part
      INNER JOIN Torneos t ON part.TorneoId = t.IdTorneo
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      WHERE part.ArbitroId IS NOT NULL
    `

    const request2 = pool.request()

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

    // Calcular gastos
    const arbitrosConPagos = arbitrosResult.recordset.map((a: any) => ({
      ...a,
      MontoPagado: a.PartidosFinalizados * TARIFA_BASE_PARTIDO,
      MontoPendiente: a.PartidosProgramados * TARIFA_BASE_PARTIDO,
      MontoTotal: a.TotalPartidos * TARIFA_BASE_PARTIDO,
    }))

    // Estadísticas financieras
    const totalArbitros = arbitrosResult.recordset.length
    const totalPartidos = arbitrosResult.recordset.reduce((acc: number, a: any) => acc + a.TotalPartidos, 0)
    const partidosFinalizados = arbitrosResult.recordset.reduce(
      (acc: number, a: any) => acc + a.PartidosFinalizados,
      0
    )
    const partidosProgramados = arbitrosResult.recordset.reduce(
      (acc: number, a: any) => acc + a.PartidosProgramados,
      0
    )

    const montoPagado = partidosFinalizados * TARIFA_BASE_PARTIDO
    const montoPendiente = partidosProgramados * TARIFA_BASE_PARTIDO
    const montoTotal = totalPartidos * TARIFA_BASE_PARTIDO

    // Porcentaje pagado
    const porcentajePagado = totalPartidos > 0 ? ((partidosFinalizados / totalPartidos) * 100).toFixed(1) : "0"

    // Distribución por deporte
    const porDeporte = deporteResult.recordset.map((d: any) => ({
      name: d.DeporteNombre,
      partidos: d.TotalPartidos,
      gasto: d.PartidosFinalizados * TARIFA_BASE_PARTIDO,
      pendiente: (d.TotalPartidos - d.PartidosFinalizados) * TARIFA_BASE_PARTIDO,
      value: d.PartidosFinalizados * TARIFA_BASE_PARTIDO, // Para gráfico
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
      tarifaPorPartido: TARIFA_BASE_PARTIDO,
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
