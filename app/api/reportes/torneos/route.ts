import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fechaInicio = searchParams.get("fechaInicio")
  const fechaFin = searchParams.get("fechaFin")
  const estado = searchParams.get("estado")
  const deporte = searchParams.get("deporte")

  try {
    const pool = await getConnection()

    // Query principal para obtener torneos con filtros
    let torneosQuery = `
      SELECT 
        t.IdTorneo,
        t.Nombre,
        t.FechaInicio,
        t.FechaFin,
        t.Estado,
        t.CantidadEquipos,
        d.Nombre as Deporte,
        tt.Nombre as TipoTorneo,
        (SELECT COUNT(*) FROM Partidos WHERE IdTorneo = t.IdTorneo) as TotalPartidos,
        (SELECT COUNT(*) FROM Partidos WHERE IdTorneo = t.IdTorneo AND Estado = 2) as PartidosFinalizados,
        (SELECT COUNT(DISTINCT IdEquipo) FROM EquiposTorneos WHERE IdTorneo = t.IdTorneo) as EquiposInscritos
      FROM Torneos t
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      INNER JOIN TiposTorneo tt ON t.IdTipoTorneo = tt.IdTipoTorneo
      WHERE 1=1
    `

    const params: any[] = []

    if (fechaInicio && fechaFin) {
      torneosQuery += ` AND t.FechaInicio BETWEEN @FechaInicio AND @FechaFin`
      params.push(
        { name: "FechaInicio", type: sql.Date, value: new Date(fechaInicio) },
        { name: "FechaFin", type: sql.Date, value: new Date(fechaFin) }
      )
    }

    if (estado && estado !== "todos") {
      const estadoMap: any = {
        planificado: 0,
        activo: 1,
        finalizado: 2,
      }
      torneosQuery += ` AND t.Estado = @Estado`
      params.push({ name: "Estado", type: sql.Int, value: estadoMap[estado] })
    }

    if (deporte && deporte !== "todos") {
      torneosQuery += ` AND d.Nombre LIKE @Deporte`
      params.push({ name: "Deporte", type: sql.VarChar, value: `%${deporte}%` })
    }

    torneosQuery += ` ORDER BY t.FechaInicio DESC`

    const request1 = pool.request()
    params.forEach((param) => {
      request1.input(param.name, param.type, param.value)
    })
    const torneosResult = await request1.query(torneosQuery)

    // Estadísticas generales
    let statsQuery = `
      SELECT 
        COUNT(*) as TotalTorneos,
        SUM(CASE WHEN t.Estado = 0 THEN 1 ELSE 0 END) as TorneosPlanificados,
        SUM(CASE WHEN t.Estado = 1 THEN 1 ELSE 0 END) as TorneosActivos,
        SUM(CASE WHEN t.Estado = 2 THEN 1 ELSE 0 END) as TorneosFinalizados,
        (SELECT COUNT(*) FROM Partidos p 
         INNER JOIN Torneos t2 ON p.IdTorneo = t2.IdTorneo 
         WHERE 1=1
         ${fechaInicio && fechaFin ? "AND t2.FechaInicio BETWEEN @FechaInicio AND @FechaFin" : ""}
        ) as TotalPartidos,
        (SELECT COUNT(DISTINCT IdEquipo) FROM EquiposTorneos et
         INNER JOIN Torneos t3 ON et.IdTorneo = t3.IdTorneo
         WHERE 1=1
         ${fechaInicio && fechaFin ? "AND t3.FechaInicio BETWEEN @FechaInicio AND @FechaFin" : ""}
        ) as TotalEquipos
      FROM Torneos t
      WHERE 1=1
    `

    if (fechaInicio && fechaFin) {
      statsQuery += ` AND t.FechaInicio BETWEEN @FechaInicio AND @FechaFin`
    }

    if (estado && estado !== "todos") {
      const estadoMap: any = {
        planificado: 0,
        activo: 1,
        finalizado: 2,
      }
      statsQuery += ` AND t.Estado = @Estado`
    }

    if (deporte && deporte !== "todos") {
      statsQuery += ` AND EXISTS (
        SELECT 1 FROM Deportes d 
        WHERE d.IdDeporte = t.IdDeporte 
        AND d.Nombre LIKE @Deporte
      )`
    }

    const request2 = pool.request()
    params.forEach((param) => {
      request2.input(param.name, param.type, param.value)
    })
    const statsResult = await request2.query(statsQuery)

    // Distribución por deporte
    let deportesQuery = `
      SELECT 
        d.Nombre as Deporte,
        COUNT(*) as Cantidad,
        SUM(t.CantidadEquipos) as TotalEquipos
      FROM Torneos t
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      WHERE 1=1
    `

    if (fechaInicio && fechaFin) {
      deportesQuery += ` AND t.FechaInicio BETWEEN @FechaInicio AND @FechaFin`
    }

    if (estado && estado !== "todos") {
      const estadoMap: any = {
        planificado: 0,
        activo: 1,
        finalizado: 2,
      }
      deportesQuery += ` AND t.Estado = @Estado`
    }

    if (deporte && deporte !== "todos") {
      deportesQuery += ` AND d.Nombre LIKE @Deporte`
    }

    deportesQuery += ` GROUP BY d.Nombre ORDER BY Cantidad DESC`

    const request3 = pool.request()
    params.forEach((param) => {
      request3.input(param.name, param.type, param.value)
    })
    const deportesResult = await request3.query(deportesQuery)

    // Torneos por mes
    let torneosMesQuery = `
      SELECT 
        FORMAT(t.FechaInicio, 'yyyy-MM') as Mes,
        COUNT(*) as Cantidad
      FROM Torneos t
      WHERE 1=1
    `

    if (fechaInicio && fechaFin) {
      torneosMesQuery += ` AND t.FechaInicio BETWEEN @FechaInicio AND @FechaFin`
    } else {
      torneosMesQuery += ` AND t.FechaInicio >= DATEADD(MONTH, -6, GETDATE())`
    }

    if (estado && estado !== "todos") {
      const estadoMap: any = {
        planificado: 0,
        activo: 1,
        finalizado: 2,
      }
      torneosMesQuery += ` AND t.Estado = @Estado`
    }

    if (deporte && deporte !== "todos") {
      torneosMesQuery += ` AND EXISTS (
        SELECT 1 FROM Deportes d 
        WHERE d.IdDeporte = t.IdDeporte 
        AND d.Nombre LIKE @Deporte
      )`
    }

    torneosMesQuery += ` GROUP BY FORMAT(t.FechaInicio, 'yyyy-MM') ORDER BY Mes`

    const request4 = pool.request()
    params.forEach((param) => {
      request4.input(param.name, param.type, param.value)
    })
    const torneosMesResult = await request4.query(torneosMesQuery)

    // Top equipos (más participaciones en torneos)
    let equiposQuery = `
      SELECT TOP 10
        e.IdEquipo,
        e.Nombre,
        d.Nombre as Deporte,
        COUNT(*) as Participaciones,
        SUM(CASE WHEN tp.Posicion = 1 THEN 1 ELSE 0 END) as Victorias
      FROM EquiposTorneos et
      INNER JOIN Equipos e ON et.IdEquipo = e.IdEquipo
      INNER JOIN Torneos t ON et.IdTorneo = t.IdTorneo
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      LEFT JOIN TablaPosiciones tp ON tp.IdEquipo = e.IdEquipo AND tp.IdTorneo = t.IdTorneo
      WHERE 1=1
    `

    if (fechaInicio && fechaFin) {
      equiposQuery += ` AND t.FechaInicio BETWEEN @FechaInicio AND @FechaFin`
    }

    if (estado && estado !== "todos") {
      const estadoMap: any = {
        planificado: 0,
        activo: 1,
        finalizado: 2,
      }
      equiposQuery += ` AND t.Estado = @Estado`
    }

    if (deporte && deporte !== "todos") {
      equiposQuery += ` AND d.Nombre LIKE @Deporte`
    }

    equiposQuery += ` GROUP BY e.IdEquipo, e.Nombre, d.Nombre ORDER BY Participaciones DESC, Victorias DESC`

    const request5 = pool.request()
    params.forEach((param) => {
      request5.input(param.name, param.type, param.value)
    })
    const equiposResult = await request5.query(equiposQuery)

    return NextResponse.json({
      torneos: torneosResult.recordset,
      estadisticas: statsResult.recordset[0],
      deportes: deportesResult.recordset,
      torneosPorMes: torneosMesResult.recordset,
      topEquipos: equiposResult.recordset,
    })
  } catch (error: any) {
    console.error("Error al obtener reporte de torneos:", error)
    return NextResponse.json({ error: "Error al obtener reporte de torneos", details: error.message }, { status: 500 })
  }
}
