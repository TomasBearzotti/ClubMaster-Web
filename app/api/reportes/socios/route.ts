import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fechaInicio = searchParams.get("fechaInicio")
  const fechaFin = searchParams.get("fechaFin")
  const estado = searchParams.get("estado")
  const tipoMembresia = searchParams.get("tipoMembresia")

  try {
    const pool = await getConnection()

    // Query principal para obtener socios con filtros
    let sociosQuery = `
      SELECT 
        s.IdSocio,
        s.IdSocio as NumeroSocio,
        p.Nombre,
        p.Apellido,
        p.Dni,
        p.Mail as Email,
        p.Telefono,
        s.Estado,
        tm.Descripcion as TipoMembresia,
        tm.MontoMensual as PrecioMembresia
      FROM Socios s
      INNER JOIN Personas p ON s.IdPersona = p.IdPersona
      INNER JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
      WHERE 1=1
    `

    const params: any[] = []

    // Nota: Socios no tiene FechaInscripcion, así que omitimos el filtro de fechas
    // o podríamos usar otro campo si existe

    if (estado && estado !== "todos") {
      sociosQuery += ` AND s.Estado = @Estado`
      params.push({ name: "Estado", type: sql.Int, value: parseInt(estado) })
    }

    if (tipoMembresia && tipoMembresia !== "todas") {
      sociosQuery += ` AND tm.IdTipo = @TipoMembresia`
      params.push({ name: "TipoMembresia", type: sql.Int, value: parseInt(tipoMembresia) })
    }

    sociosQuery += ` ORDER BY s.IdSocio DESC`

    const request1 = pool.request()
    params.forEach((param) => {
      request1.input(param.name, param.type, param.value)
    })
    const sociosResult = await request1.query(sociosQuery)

    // Estadísticas generales
    let statsQuery = `
      SELECT 
        COUNT(*) as TotalSocios,
        SUM(CASE WHEN s.Estado = 1 THEN 1 ELSE 0 END) as SociosActivos,
        SUM(CASE WHEN s.Estado = 0 THEN 1 ELSE 0 END) as SociosInactivos
      FROM Socios s
      WHERE 1=1
    `

    if (estado && estado !== "todos") {
      statsQuery += ` AND s.Estado = @Estado`
    }

    if (tipoMembresia && tipoMembresia !== "todas") {
      statsQuery += ` AND s.TipoMembresiaId = @TipoMembresia`
    }

    const request2 = pool.request()
    params.forEach((param) => {
      request2.input(param.name, param.type, param.value)
    })
    const statsResult = await request2.query(statsQuery)

    // Distribución por tipo de membresía
    let membresiasQuery = `
      SELECT 
        tm.Descripcion as TipoMembresia,
        COUNT(*) as Cantidad,
        SUM(tm.MontoMensual) as IngresoTotal
      FROM Socios s
      INNER JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
      WHERE 1=1
    `

    if (estado && estado !== "todos") {
      membresiasQuery += ` AND s.Estado = @Estado`
    }

    if (tipoMembresia && tipoMembresia !== "todas") {
      membresiasQuery += ` AND tm.IdTipo = @TipoMembresia`
    }

    membresiasQuery += ` GROUP BY tm.Descripcion, tm.MontoMensual ORDER BY Cantidad DESC`

    const request3 = pool.request()
    params.forEach((param) => {
      request3.input(param.name, param.type, param.value)
    })
    const membresiasResult = await request3.query(membresiasQuery)

    const stats = statsResult.recordset[0]

    // Formatear datos para los gráficos
    const porEstado = [
      { name: "Activos", value: stats.SociosActivos || 0 },
      { name: "Inactivos", value: stats.SociosInactivos || 0 },
    ]

    const porMembresia = membresiasResult.recordset.map((m: any) => ({
      name: m.TipoMembresia,
      value: m.Cantidad,
    }))

    return NextResponse.json({
      socios: sociosResult.recordset,
      estadisticas: {
        totalSocios: stats.TotalSocios || 0,
        activos: stats.SociosActivos || 0,
        inactivos: stats.SociosInactivos || 0,
        porEstado,
        porMembresia,
      },
    })
  } catch (error: any) {
    console.error("Error al obtener reporte de socios:", error)
    return NextResponse.json({ error: "Error al obtener reporte de socios", details: error.message }, { status: 500 })
  }
}
