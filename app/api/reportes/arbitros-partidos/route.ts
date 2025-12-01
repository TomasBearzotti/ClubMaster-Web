import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")
    const estado = searchParams.get("estado")
    const deporte = searchParams.get("deporte")

    const pool = await getConnection()

    // Query para obtener árbitros con información de partidos
    let arbitrosQuery = `
      SELECT 
        a.IdArbitro,
        a.Estado,
        p.Nombre,
        p.Apellido,
        p.Dni,
        p.Telefono,
        p.Mail,
        COUNT(DISTINCT part.IdPartido) as TotalPartidos,
        COUNT(DISTINCT part.TorneoId) as TotalTorneos
      FROM Arbitros a
      INNER JOIN Personas p ON a.IdPersona = p.IdPersona
      LEFT JOIN Partidos part ON a.IdArbitro = part.ArbitroId
      WHERE 1=1
    `

    const request1 = pool.request()

    if (estado && estado !== "todos") {
      arbitrosQuery += ` AND a.Estado = @estado`
      request1.input("estado", sql.Int, parseInt(estado))
    }

    if (fechaInicio && fechaFin) {
      arbitrosQuery += ` AND part.FechaPartido BETWEEN @fechaInicio AND @fechaFin`
      request1.input("fechaInicio", sql.Date, fechaInicio)
      request1.input("fechaFin", sql.Date, fechaFin)
    }

    arbitrosQuery += `
      GROUP BY a.IdArbitro, a.Estado, p.Nombre, p.Apellido, p.Dni, p.Telefono, p.Mail
      ORDER BY TotalPartidos DESC
    `

    const arbitrosResult = await request1.query(arbitrosQuery)

    // Query para obtener partidos detallados
    let partidosQuery = `
      SELECT 
        part.IdPartido,
        part.FechaPartido,
        part.HoraPartido,
        part.Lugar,
        part.EstadoPartido,
        a.IdArbitro,
        p.Nombre as ArbitroNombre,
        p.Apellido as ArbitroApellido,
        t.Nombre as TorneoNombre,
        d.Nombre as DeporteNombre,
        eqA.Nombre as EquipoA,
        eqB.Nombre as EquipoB
      FROM Partidos part
      INNER JOIN Arbitros a ON part.ArbitroId = a.IdArbitro
      INNER JOIN Personas p ON a.IdPersona = p.IdPersona
      INNER JOIN Torneos t ON part.TorneoId = t.IdTorneo
      INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
      LEFT JOIN Equipos eqA ON part.ParticipanteAId = eqA.IdEquipo
      LEFT JOIN Equipos eqB ON part.ParticipanteBId = eqB.IdEquipo
      WHERE 1=1
    `

    const request2 = pool.request()

    if (estado && estado !== "todos") {
      partidosQuery += ` AND a.Estado = @estado`
      request2.input("estado", sql.Int, parseInt(estado))
    }

    if (fechaInicio && fechaFin) {
      partidosQuery += ` AND part.FechaPartido BETWEEN @fechaInicio AND @fechaFin`
      request2.input("fechaInicio", sql.Date, fechaInicio)
      request2.input("fechaFin", sql.Date, fechaFin)
    }

    if (deporte && deporte !== "todos") {
      partidosQuery += ` AND d.IdDeporte = @deporte`
      request2.input("deporte", sql.Int, parseInt(deporte))
    }

    partidosQuery += ` ORDER BY part.FechaPartido DESC, part.HoraPartido DESC`

    const partidosResult = await request2.query(partidosQuery)

    // Estadísticas generales
    const totalArbitros = arbitrosResult.recordset.length
    const activos = arbitrosResult.recordset.filter((a: any) => a.Estado === 1).length
    const inactivos = arbitrosResult.recordset.filter((a: any) => a.Estado === 0).length
    const totalPartidos = partidosResult.recordset.length

    // Distribución por estado
    const porEstado = [
      { name: "Activos", value: activos },
      { name: "Inactivos", value: inactivos },
    ].filter((item) => item.value > 0)

    // Top árbitros por cantidad de partidos
    const topArbitros = arbitrosResult.recordset
      .slice(0, 10)
      .map((a: any) => ({
        name: `${a.Nombre} ${a.Apellido}`,
        value: a.TotalPartidos,
        torneos: a.TotalTorneos,
      }))

    // Distribución de partidos por deporte
    const partidosPorDeporte = new Map()
    partidosResult.recordset.forEach((p: any) => {
      const deporte = p.DeporteNombre
      if (!partidosPorDeporte.has(deporte)) {
        partidosPorDeporte.set(deporte, { name: deporte, value: 0 })
      }
      partidosPorDeporte.get(deporte).value++
    })

    const porDeporte = Array.from(partidosPorDeporte.values())

    // Partidos por estado
    const estadosPartidos = new Map()
    partidosResult.recordset.forEach((p: any) => {
      const estado = p.EstadoPartido || "Sin definir"
      if (!estadosPartidos.has(estado)) {
        estadosPartidos.set(estado, { name: estado, value: 0 })
      }
      estadosPartidos.get(estado).value++
    })

    const porEstadoPartido = Array.from(estadosPartidos.values())

    // Promedio de partidos por árbitro activo
    const promedioPartidosPorArbitro = activos > 0 ? (totalPartidos / activos).toFixed(1) : "0"

    const estadisticas = {
      totalArbitros,
      activos,
      inactivos,
      totalPartidos,
      promedioPartidosPorArbitro: parseFloat(promedioPartidosPorArbitro),
      porEstado,
      topArbitros,
      porDeporte,
      porEstadoPartido,
    }

    return NextResponse.json({
      arbitros: arbitrosResult.recordset,
      partidos: partidosResult.recordset,
      estadisticas,
    })
  } catch (error: any) {
    console.error("Error en reporte de árbitros y partidos:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte", details: error.message },
      { status: 500 }
    )
  }
}
