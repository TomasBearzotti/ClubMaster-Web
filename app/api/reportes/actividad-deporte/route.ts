import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deporte = searchParams.get("deporte")
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")

    const pool = await getConnection()

    // ========== QUERY PRINCIPAL: ESTADÍSTICAS POR DEPORTE ==========
    let deportesQuery = `
      SELECT 
        d.IdDeporte,
        d.Nombre as Deporte,
        COUNT(DISTINCT e.IdEquipo) as TotalEquipos,
        COUNT(DISTINCT t.IdTorneo) as TotalTorneos,
        COUNT(DISTINCT CASE WHEN t.Estado = 1 THEN t.IdTorneo END) as TorneosActivos,
        COUNT(DISTINCT CASE WHEN t.Estado = 2 THEN t.IdTorneo END) as TorneosFinalizados,
        COUNT(DISTINCT p.IdPartido) as TotalPartidos,
        COUNT(DISTINCT CASE WHEN p.EstadoPartido = 'Finalizado' THEN p.IdPartido END) as PartidosFinalizados,
        COUNT(DISTINCT CASE WHEN p.EstadoPartido = 'Programado' THEN p.IdPartido END) as PartidosProgramados,
        COUNT(DISTINCT s.IdSocio) as SociosParticipantes
      FROM Deportes d
      LEFT JOIN Equipos e ON d.IdDeporte = e.IdDeporte
      LEFT JOIN Torneos t ON d.IdDeporte = t.IdDeporte
      LEFT JOIN Partidos p ON t.IdTorneo = p.TorneoId
      LEFT JOIN Participantes part ON t.IdTorneo = part.TorneoId
      LEFT JOIN Socios s ON part.SocioId = s.IdSocio
      WHERE 1=1
    `

    const request1 = pool.request()

    if (deporte && deporte !== "todos") {
      deportesQuery += ` AND d.IdDeporte = @deporte`
      request1.input("deporte", sql.Int, parseInt(deporte))
    }

    if (fechaInicio && fechaFin) {
      deportesQuery += ` AND t.FechaInicio >= @fechaInicio AND t.FechaInicio <= @fechaFin`
      request1.input("fechaInicio", sql.Date, new Date(fechaInicio))
      request1.input("fechaFin", sql.Date, new Date(fechaFin))
    }

    deportesQuery += `
      GROUP BY d.IdDeporte, d.Nombre
      ORDER BY TotalTorneos DESC, TotalPartidos DESC
    `

    const deportesResult = await request1.query(deportesQuery)

    // ========== EVOLUCIÓN MENSUAL DE ACTIVIDAD ==========
    let evolucionQuery = `
      SELECT 
        FORMAT(t.FechaInicio, 'yyyy-MM') as Mes,
        d.Nombre as Deporte,
        COUNT(DISTINCT t.IdTorneo) as Torneos,
        COUNT(DISTINCT p.IdPartido) as Partidos
      FROM Deportes d
      LEFT JOIN Torneos t ON d.IdDeporte = t.IdDeporte
      LEFT JOIN Partidos p ON t.IdTorneo = p.TorneoId
      WHERE t.FechaInicio IS NOT NULL
    `

    const request2 = pool.request()

    if (deporte && deporte !== "todos") {
      evolucionQuery += ` AND d.IdDeporte = @deporte`
      request2.input("deporte", sql.Int, parseInt(deporte))
    }

    if (fechaInicio && fechaFin) {
      evolucionQuery += ` AND t.FechaInicio >= @fechaInicio AND t.FechaInicio <= @fechaFin`
      request2.input("fechaInicio", sql.Date, new Date(fechaInicio))
      request2.input("fechaFin", sql.Date, new Date(fechaFin))
    }

    evolucionQuery += `
      GROUP BY FORMAT(t.FechaInicio, 'yyyy-MM'), d.Nombre
      ORDER BY Mes DESC
    `

    const evolucionResult = await request2.query(evolucionQuery)

    // ========== TOP TORNEOS MÁS ACTIVOS ==========
    let topTorneosQuery = `
      SELECT TOP 5
        t.Nombre as Torneo,
        d.Nombre as Deporte,
        COUNT(DISTINCT p.IdPartido) as TotalPartidos,
        COUNT(DISTINCT part.IdParticipante) as Participantes,
        t.FechaInicio,
        CASE 
          WHEN t.Estado = 0 THEN 'Planificado'
          WHEN t.Estado = 1 THEN 'Activo'
          WHEN t.Estado = 2 THEN 'Finalizado'
          ELSE 'Desconocido'
        END as Estado
      FROM Torneos t
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      LEFT JOIN Partidos p ON t.IdTorneo = p.TorneoId
      LEFT JOIN Participantes part ON t.IdTorneo = part.TorneoId
      WHERE 1=1
    `

    const request3 = pool.request()

    if (deporte && deporte !== "todos") {
      topTorneosQuery += ` AND d.IdDeporte = @deporte`
      request3.input("deporte", sql.Int, parseInt(deporte))
    }

    if (fechaInicio && fechaFin) {
      topTorneosQuery += ` AND t.FechaInicio >= @fechaInicio AND t.FechaInicio <= @fechaFin`
      request3.input("fechaInicio", sql.Date, new Date(fechaInicio))
      request3.input("fechaFin", sql.Date, new Date(fechaFin))
    }

    topTorneosQuery += `
      GROUP BY t.IdTorneo, t.Nombre, d.Nombre, t.FechaInicio, t.Estado
      ORDER BY TotalPartidos DESC, Participantes DESC
    `

    const topTorneosResult = await request3.query(topTorneosQuery)

    // ========== DISTRIBUCIÓN DE PARTIDOS POR ESTADO ==========
    let partidosEstadoQuery = `
      SELECT 
        p.EstadoPartido,
        COUNT(*) as Total
      FROM Partidos p
      INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      WHERE 1=1
    `

    const request4 = pool.request()

    if (deporte && deporte !== "todos") {
      partidosEstadoQuery += ` AND d.IdDeporte = @deporte`
      request4.input("deporte", sql.Int, parseInt(deporte))
    }

    if (fechaInicio && fechaFin) {
      partidosEstadoQuery += ` AND t.FechaInicio >= @fechaInicio AND t.FechaInicio <= @fechaFin`
      request4.input("fechaInicio", sql.Date, new Date(fechaInicio))
      request4.input("fechaFin", sql.Date, new Date(fechaFin))
    }

    partidosEstadoQuery += `
      GROUP BY p.EstadoPartido
      ORDER BY Total DESC
    `

    const partidosEstadoResult = await request4.query(partidosEstadoQuery)

    // ========== PROCESAR DATOS ==========
    const deportes = deportesResult.recordset.map((d: any) => ({
      ...d,
      TasaFinalizacion: d.TotalPartidos > 0 
        ? ((d.PartidosFinalizados / d.TotalPartidos) * 100).toFixed(1) 
        : '0.0'
    }))

    // Agrupar evolución por mes
    const evolucionMensual = evolucionResult.recordset.reduce((acc: any, item: any) => {
      const mesExistente = acc.find((m: any) => m.name === item.Mes)
      if (mesExistente) {
        mesExistente[item.Deporte] = item.Partidos
      } else {
        acc.push({
          name: item.Mes,
          [item.Deporte]: item.Partidos
        })
      }
      return acc
    }, [])

    const topTorneos = topTorneosResult.recordset

    const partidosPorEstado = partidosEstadoResult.recordset.map((e: any) => ({
      name: e.EstadoPartido || 'Sin Estado',
      value: e.Total,
      color: e.EstadoPartido === 'Finalizado' ? '#10b981' : 
             e.EstadoPartido === 'Programado' ? '#3b82f6' : 
             e.EstadoPartido === 'En Curso' ? '#f59e0b' : '#6b7280'
    }))

    // Calcular estadísticas generales
    const stats = deportesResult.recordset[0] || {}
    const totalDeportes = deportesResult.recordset.length
    const totalEquipos = deportesResult.recordset.reduce((sum: number, d: any) => sum + d.TotalEquipos, 0)
    const totalTorneos = deportesResult.recordset.reduce((sum: number, d: any) => sum + d.TotalTorneos, 0)
    const totalPartidos = deportesResult.recordset.reduce((sum: number, d: any) => sum + d.TotalPartidos, 0)
    const totalSocios = deportesResult.recordset.reduce((sum: number, d: any) => sum + d.SociosParticipantes, 0)
    const promedioPartidosPorTorneo = totalTorneos > 0 ? (totalPartidos / totalTorneos).toFixed(1) : '0.0'

    const estadisticas = {
      totalDeportes,
      totalEquipos,
      totalTorneos,
      totalPartidos,
      totalSocios,
      promedioPartidosPorTorneo,
      evolucionMensual,
      topTorneos,
      partidosPorEstado
    }

    return NextResponse.json({
      deportes,
      estadisticas,
    })
  } catch (error: any) {
    console.error("Error en reporte de actividad por deporte:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte", details: error.message },
      { status: 500 }
    )
  }
}
