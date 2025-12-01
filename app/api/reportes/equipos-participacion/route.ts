import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deporte = searchParams.get("deporte")
    const estadoEquipo = searchParams.get("estadoEquipo")
    const torneo = searchParams.get("torneo")

    const pool = await getConnection()

    // ========== QUERY PRINCIPAL: EQUIPOS CON PARTICIPACIONES ==========
    let equiposQuery = `
      SELECT 
        e.IdEquipo,
        e.Nombre as NombreEquipo,
        d.Nombre as Deporte,
        d.IdDeporte,
        COUNT(DISTINCT p.TorneoId) as TotalTorneos,
        COUNT(DISTINCT CASE WHEN t.Estado = 1 THEN p.TorneoId END) as TorneosActivos,
        COUNT(DISTINCT CASE WHEN t.Estado = 2 THEN p.TorneoId END) as TorneosFinalizados,
        COUNT(DISTINCT p.IdParticipante) as TotalParticipaciones,
        0 as TotalPartidos
      FROM Equipos e
      INNER JOIN Deportes d ON e.IdDeporte = d.IdDeporte
      LEFT JOIN Participantes p ON e.IdEquipo = p.EquipoId AND p.EsEquipo = 1
      LEFT JOIN Torneos t ON p.TorneoId = t.IdTorneo
      WHERE 1=1
    `

    const request1 = pool.request()

    if (deporte && deporte !== "todos") {
      equiposQuery += ` AND d.IdDeporte = @deporte`
      request1.input("deporte", sql.Int, parseInt(deporte))
    }

    if (estadoEquipo && estadoEquipo !== "todos") {
      // No hay campo Estado en Equipos, filtrar por si tienen torneos activos
      if (estadoEquipo === "1") {
        equiposQuery += ` AND EXISTS (
          SELECT 1 FROM Participantes p2 
          INNER JOIN Torneos t2 ON p2.TorneoId = t2.IdTorneo 
          WHERE p2.EquipoId = e.IdEquipo AND p2.EsEquipo = 1 AND t2.Estado = 1
        )`
      } else if (estadoEquipo === "0") {
        equiposQuery += ` AND NOT EXISTS (
          SELECT 1 FROM Participantes p2 
          INNER JOIN Torneos t2 ON p2.TorneoId = t2.IdTorneo 
          WHERE p2.EquipoId = e.IdEquipo AND p2.EsEquipo = 1 AND t2.Estado = 1
        )`
      }
    }

    if (torneo && torneo !== "todos") {
      equiposQuery += ` AND p.TorneoId = @torneo`
      request1.input("torneo", sql.Int, parseInt(torneo))
    }

    equiposQuery += `
      GROUP BY e.IdEquipo, e.Nombre, d.Nombre, d.IdDeporte
      ORDER BY TotalParticipaciones DESC
    `

    const equiposResult = await request1.query(equiposQuery)

    // ========== CALCULAR PARTIDOS POR EQUIPO ==========
    const equiposConPartidos = await Promise.all(
      equiposResult.recordset.map(async (equipo: any) => {
        const partidosQuery = `
          SELECT COUNT(DISTINCT pa.IdPartido) as TotalPartidos
          FROM Partidos pa
          INNER JOIN Participantes p1 ON pa.ParticipanteAId = p1.IdParticipante
          INNER JOIN Participantes p2 ON pa.ParticipanteBId = p2.IdParticipante
          WHERE (p1.EquipoId = @equipoId AND p1.EsEquipo = 1)
             OR (p2.EquipoId = @equipoId AND p2.EsEquipo = 1)
        `
        const request = pool.request()
        request.input("equipoId", sql.Int, equipo.IdEquipo)
        const result = await request.query(partidosQuery)
        
        return {
          ...equipo,
          TotalPartidos: result.recordset[0]?.TotalPartidos || 0
        }
      })
    )

    // ========== ESTADÍSTICAS GENERALES ==========
    let statsQuery = `
      SELECT 
        COUNT(DISTINCT e.IdEquipo) as TotalEquipos,
        COUNT(DISTINCT p.TorneoId) as TotalTorneosConParticipacion,
        COUNT(DISTINCT p.IdParticipante) as TotalParticipaciones
      FROM Equipos e
      INNER JOIN Deportes d ON e.IdDeporte = d.IdDeporte
      LEFT JOIN Participantes p ON e.IdEquipo = p.EquipoId AND p.EsEquipo = 1
      WHERE 1=1
    `

    const request2 = pool.request()

    if (deporte && deporte !== "todos") {
      statsQuery += ` AND d.IdDeporte = @deporte`
      request2.input("deporte", sql.Int, parseInt(deporte))
    }

    const statsResult = await request2.query(statsQuery)

    // Calcular equipos activos e inactivos
    let activosQuery = `
      SELECT COUNT(DISTINCT e.IdEquipo) as EquiposActivos
      FROM Equipos e
      INNER JOIN Deportes d ON e.IdDeporte = d.IdDeporte
      WHERE EXISTS (
        SELECT 1 FROM Participantes p2 
        INNER JOIN Torneos t2 ON p2.TorneoId = t2.IdTorneo 
        WHERE p2.EquipoId = e.IdEquipo AND p2.EsEquipo = 1 AND t2.Estado = 1
      )
    `

    const request2a = pool.request()
    if (deporte && deporte !== "todos") {
      activosQuery += ` AND d.IdDeporte = @deporte`
      request2a.input("deporte", sql.Int, parseInt(deporte))
    }

    const activosResult = await request2a.query(activosQuery)

    // Calcular promedio de participaciones por separado
    let promedioQuery = `
      SELECT AVG(CAST(TotalParticipaciones as FLOAT)) as PromedioParticipaciones
      FROM (
        SELECT e.IdEquipo, COUNT(*) as TotalParticipaciones
        FROM Equipos e
        INNER JOIN Deportes d ON e.IdDeporte = d.IdDeporte
        INNER JOIN Participantes p ON e.IdEquipo = p.EquipoId AND p.EsEquipo = 1
        WHERE 1=1
    `

    const request2b = pool.request()

    if (deporte && deporte !== "todos") {
      promedioQuery += ` AND d.IdDeporte = @deporte`
      request2b.input("deporte", sql.Int, parseInt(deporte))
    }

    promedioQuery += `
        GROUP BY e.IdEquipo
      ) as Subquery
    `

    const promedioResult = await request2b.query(promedioQuery)

    // ========== DISTRIBUCIÓN POR DEPORTE ==========
    let porDeporteQuery = `
      SELECT 
        d.Nombre as Deporte,
        COUNT(DISTINCT e.IdEquipo) as TotalEquipos,
        COUNT(DISTINCT p.TorneoId) as TotalTorneos
      FROM Deportes d
      LEFT JOIN Equipos e ON d.IdDeporte = e.IdDeporte
      LEFT JOIN Participantes p ON e.IdEquipo = p.EquipoId AND p.EsEquipo = 1
      WHERE 1=1
    `

    const request3 = pool.request()

    if (estadoEquipo && estadoEquipo !== "todos") {
      if (estadoEquipo === "1") {
        porDeporteQuery += ` AND EXISTS (
          SELECT 1 FROM Participantes p2 
          INNER JOIN Torneos t2 ON p2.TorneoId = t2.IdTorneo 
          WHERE p2.EquipoId = e.IdEquipo AND p2.EsEquipo = 1 AND t2.Estado = 1
        )`
      } else if (estadoEquipo === "0") {
        porDeporteQuery += ` AND NOT EXISTS (
          SELECT 1 FROM Participantes p2 
          INNER JOIN Torneos t2 ON p2.TorneoId = t2.IdTorneo 
          WHERE p2.EquipoId = e.IdEquipo AND p2.EsEquipo = 1 AND t2.Estado = 1
        )`
      }
    }

    porDeporteQuery += `
      GROUP BY d.Nombre
      HAVING COUNT(DISTINCT e.IdEquipo) > 0
      ORDER BY TotalEquipos DESC
    `

    const porDeporteResult = await request3.query(porDeporteQuery)

    // ========== TOP EQUIPOS MÁS ACTIVOS ==========
    let topEquiposQuery = `
      SELECT TOP 10
        e.Nombre as NombreEquipo,
        d.Nombre as Deporte,
        COUNT(DISTINCT p.TorneoId) as Participaciones,
        COUNT(DISTINCT CASE WHEN t.Estado = 1 THEN p.TorneoId END) as TorneosActivos
      FROM Equipos e
      INNER JOIN Deportes d ON e.IdDeporte = d.IdDeporte
      INNER JOIN Participantes p ON e.IdEquipo = p.EquipoId AND p.EsEquipo = 1
      INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
      WHERE 1=1
    `

    const request4 = pool.request()

    if (deporte && deporte !== "todos") {
      topEquiposQuery += ` AND d.IdDeporte = @deporte`
      request4.input("deporte", sql.Int, parseInt(deporte))
    }

    topEquiposQuery += `
      GROUP BY e.IdEquipo, e.Nombre, d.Nombre
      ORDER BY Participaciones DESC
    `

    const topEquiposResult = await request4.query(topEquiposQuery)

    // ========== DISTRIBUCIÓN POR ESTADO ==========
    let porEstadoQuery = `
      SELECT 
        Estado,
        COUNT(*) as Total
      FROM (
        SELECT 
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM Participantes p2 
              WHERE p2.EquipoId = e.IdEquipo AND p2.EsEquipo = 1
            ) THEN 'Con Torneos'
            ELSE 'Sin Torneos'
          END as Estado
        FROM Equipos e
        INNER JOIN Deportes d ON e.IdDeporte = d.IdDeporte
        WHERE 1=1
    `

    const request5 = pool.request()

    if (deporte && deporte !== "todos") {
      porEstadoQuery += ` AND d.IdDeporte = @deporte`
      request5.input("deporte", sql.Int, parseInt(deporte))
    }

    porEstadoQuery += `
      ) as EstadosEquipos
      GROUP BY Estado
      ORDER BY Total DESC
    `

    const porEstadoResult = await request5.query(porEstadoQuery)

    // ========== PROCESAR DATOS ==========
    const stats = statsResult.recordset[0] || {
      TotalEquipos: 0,
      TotalTorneosConParticipacion: 0,
      TotalParticipaciones: 0,
    }

    const activosStats = activosResult.recordset[0] || {
      EquiposActivos: 0,
    }

    const promedioStats = promedioResult.recordset[0] || {
      PromedioParticipaciones: 0,
    }

    const porDeporte = porDeporteResult.recordset.map((d: any) => ({
      name: d.Deporte,
      equipos: d.TotalEquipos,
      torneos: d.TotalTorneos,
      value: d.TotalEquipos,
    }))

    const porEstado = porEstadoResult.recordset.map((e: any) => ({
      name: e.Estado,
      value: e.Total,
      color: e.Estado === "Con Torneos" ? "#10b981" : "#6b7280",
    }))

    const topEquipos = topEquiposResult.recordset.map((e: any) => ({
      nombre: e.NombreEquipo,
      deporte: e.Deporte,
      participaciones: e.Participaciones,
      torneosActivos: e.TorneosActivos,
      value: e.Participaciones,
    }))

    const equiposActivos = activosStats.EquiposActivos || 0
    const totalEquipos = stats.TotalEquipos || 0
    const equiposInactivos = totalEquipos - equiposActivos

    const estadisticas = {
      totalEquipos: totalEquipos,
      equiposActivos: equiposActivos,
      equiposInactivos: equiposInactivos,
      totalTorneosConParticipacion: stats.TotalTorneosConParticipacion || 0,
      totalParticipaciones: stats.TotalParticipaciones || 0,
      promedioParticipaciones: parseFloat(promedioStats.PromedioParticipaciones || 0).toFixed(1),
      porDeporte,
      porEstado,
      topEquipos,
    }

    return NextResponse.json({
      equipos: equiposConPartidos,
      estadisticas,
    })
  } catch (error: any) {
    console.error("Error en reporte de equipos y participación:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte", details: error.message },
      { status: 500 }
    )
  }
}
