import { NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")
    const tipoMembresia = searchParams.get("tipoMembresia")
    const nivelRiesgo = searchParams.get("nivelRiesgo") // critico (5+), alto (3-4), medio (1-2)

    const pool = await getConnection()

    // Consulta principal: Socios con deuda
    const request1 = pool.request()
    
    let sociosQuery = `
      SELECT 
        s.IdSocio as NumeroSocio,
        p.Nombre,
        p.Apellido,
        p.Dni,
        p.Telefono,
        p.Mail,
        tm.Descripcion as TipoMembresia,
        tm.MontoMensual,
        s.Estado as EstadoSocio,
        COUNT(c.IdCuota) as CuotasVencidas,
        SUM(c.Monto + ISNULL(c.Recargo, 0)) as DeudaTotal,
        MIN(c.FechaVencimiento) as PrimeraDeuda,
        MAX(c.FechaVencimiento) as UltimaDeuda,
        DATEDIFF(DAY, MIN(c.FechaVencimiento), GETDATE()) as DiasEnMora
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      INNER JOIN Personas p ON s.IdPersona = p.IdPersona
      INNER JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
      WHERE c.Estado = 0 AND c.FechaVencimiento < GETDATE()
    `

    if (fechaInicio && fechaFin) {
      sociosQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      request1.input("FechaInicio", sql.Date, new Date(fechaInicio))
      request1.input("FechaFin", sql.Date, new Date(fechaFin))
    }

    if (tipoMembresia && tipoMembresia !== "todos") {
      sociosQuery += ` AND s.TipoMembresiaId = @TipoMembresia`
      request1.input("TipoMembresia", sql.Int, parseInt(tipoMembresia))
    }

    sociosQuery += `
      GROUP BY 
        s.IdSocio, p.Nombre, p.Apellido, p.Dni, p.Telefono, p.Mail,
        tm.Descripcion, tm.MontoMensual, s.Estado
      HAVING COUNT(c.IdCuota) > 0
    `

    // Filtro por nivel de riesgo
    if (nivelRiesgo && nivelRiesgo !== "todos") {
      if (nivelRiesgo === "critico") {
        sociosQuery += ` AND COUNT(c.IdCuota) >= 5`
      } else if (nivelRiesgo === "alto") {
        sociosQuery += ` AND COUNT(c.IdCuota) BETWEEN 3 AND 4`
      } else if (nivelRiesgo === "medio") {
        sociosQuery += ` AND COUNT(c.IdCuota) BETWEEN 1 AND 2`
      }
    }

    sociosQuery += ` ORDER BY COUNT(c.IdCuota) DESC, DeudaTotal DESC`

    const sociosResult = await request1.query(sociosQuery)

    // Estadísticas generales
    const request2 = pool.request()
    
    let statsQuery = `
      SELECT 
        COUNT(DISTINCT s.IdSocio) as TotalMorosos,
        COUNT(c.IdCuota) as TotalCuotasVencidas,
        SUM(c.Monto + ISNULL(c.Recargo, 0)) as DeudaTotal,
        AVG(CAST(c.Monto + ISNULL(c.Recargo, 0) AS FLOAT)) as PromedioDeuda,
        COUNT(DISTINCT CASE WHEN c.FechaVencimiento < DATEADD(MONTH, -1, GETDATE()) THEN s.IdSocio END) as MorososMasDe1Mes,
        COUNT(DISTINCT CASE WHEN c.FechaVencimiento < DATEADD(MONTH, -3, GETDATE()) THEN s.IdSocio END) as MorososMasDe3Meses,
        COUNT(DISTINCT CASE WHEN c.FechaVencimiento < DATEADD(MONTH, -6, GETDATE()) THEN s.IdSocio END) as MorososMasDe6Meses
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      WHERE c.Estado = 0 AND c.FechaVencimiento < GETDATE()
    `

    if (fechaInicio && fechaFin) {
      statsQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      request2.input("FechaInicio", sql.Date, new Date(fechaInicio))
      request2.input("FechaFin", sql.Date, new Date(fechaFin))
    }

    if (tipoMembresia && tipoMembresia !== "todos") {
      statsQuery += ` AND s.TipoMembresiaId = @TipoMembresia`
      request2.input("TipoMembresia", sql.Int, parseInt(tipoMembresia))
    }

    const statsResult = await request2.query(statsQuery)

    // Distribución por cantidad de cuotas vencidas
    const request3 = pool.request()
    
    let distribucionQuery = `
      SELECT 
        CASE 
          WHEN CuotasVencidas >= 5 THEN '5+ cuotas (Crítico)'
          WHEN CuotasVencidas BETWEEN 3 AND 4 THEN '3-4 cuotas (Alto)'
          WHEN CuotasVencidas BETWEEN 1 AND 2 THEN '1-2 cuotas (Medio)'
          ELSE 'Sin deuda'
        END as NivelRiesgo,
        COUNT(*) as Cantidad,
        SUM(DeudaTotal) as MontoTotal
      FROM (
        SELECT 
          s.IdSocio,
          COUNT(c.IdCuota) as CuotasVencidas,
          SUM(c.Monto + ISNULL(c.Recargo, 0)) as DeudaTotal
        FROM Cuotas c
        INNER JOIN Socios s ON c.SocioId = s.IdSocio
        WHERE c.Estado = 0 AND c.FechaVencimiento < GETDATE()
    `

    if (fechaInicio && fechaFin) {
      distribucionQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      request3.input("FechaInicio", sql.Date, new Date(fechaInicio))
      request3.input("FechaFin", sql.Date, new Date(fechaFin))
    }

    if (tipoMembresia && tipoMembresia !== "todos") {
      distribucionQuery += ` AND s.TipoMembresiaId = @TipoMembresia`
      request3.input("TipoMembresia", sql.Int, parseInt(tipoMembresia))
    }

    distribucionQuery += `
        GROUP BY s.IdSocio
      ) as Subquery
      GROUP BY 
        CASE 
          WHEN CuotasVencidas >= 5 THEN '5+ cuotas (Crítico)'
          WHEN CuotasVencidas BETWEEN 3 AND 4 THEN '3-4 cuotas (Alto)'
          WHEN CuotasVencidas BETWEEN 1 AND 2 THEN '1-2 cuotas (Medio)'
          ELSE 'Sin deuda'
        END
      ORDER BY MontoTotal DESC
    `

    const distribucionResult = await request3.query(distribucionQuery)

    // Distribución por tipo de membresía
    const request4 = pool.request()
    
    let membresiasQuery = `
      SELECT 
        tm.Descripcion as TipoMembresia,
        COUNT(DISTINCT s.IdSocio) as CantidadMorosos,
        COUNT(c.IdCuota) as CuotasVencidas,
        SUM(c.Monto + ISNULL(c.Recargo, 0)) as DeudaTotal
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      INNER JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
      WHERE c.Estado = 0 AND c.FechaVencimiento < GETDATE()
    `

    if (fechaInicio && fechaFin) {
      membresiasQuery += ` AND c.FechaVencimiento BETWEEN @FechaInicio AND @FechaFin`
      request4.input("FechaInicio", sql.Date, new Date(fechaInicio))
      request4.input("FechaFin", sql.Date, new Date(fechaFin))
    }

    if (tipoMembresia && tipoMembresia !== "todos") {
      membresiasQuery += ` AND s.TipoMembresiaId = @TipoMembresia`
      request4.input("TipoMembresia", sql.Int, parseInt(tipoMembresia))
    }

    membresiasQuery += `
      GROUP BY tm.Descripcion
      ORDER BY DeudaTotal DESC
    `

    const membresiasResult = await request4.query(membresiasQuery)

    // Evolución mensual de morosidad (últimos 6 meses)
    const request5 = pool.request()
    
    const evolucionQuery = `
      SELECT 
        FORMAT(DATEFROMPARTS(c.Anio, c.Mes, 1), 'yyyy-MM') as Mes,
        COUNT(DISTINCT s.IdSocio) as MorososDelMes,
        COUNT(c.IdCuota) as CuotasVencidas,
        SUM(c.Monto + ISNULL(c.Recargo, 0)) as DeudaTotal
      FROM Cuotas c
      INNER JOIN Socios s ON c.SocioId = s.IdSocio
      WHERE c.Estado = 0 
        AND c.FechaVencimiento < GETDATE()
        AND c.FechaVencimiento >= DATEADD(MONTH, -6, GETDATE())
      GROUP BY c.Anio, c.Mes
      ORDER BY c.Anio, c.Mes
    `

    const evolucionResult = await request5.query(evolucionQuery)

    const stats = statsResult.recordset[0]
    const socios = sociosResult.recordset
    
    // Calcular porcentajes y niveles de riesgo
    const sociosConRiesgo = socios.map((socio: any) => ({
      ...socio,
      NivelRiesgo: socio.CuotasVencidas >= 5 
        ? 'critico' 
        : socio.CuotasVencidas >= 3 
          ? 'alto' 
          : 'medio',
      PorcentajeSuspension: Math.min((socio.CuotasVencidas / 6) * 100, 100)
    }))

    return NextResponse.json({
      socios: sociosConRiesgo,
      estadisticas: {
        totalMorosos: stats.TotalMorosos || 0,
        totalCuotasVencidas: stats.TotalCuotasVencidas || 0,
        deudaTotal: stats.DeudaTotal || 0,
        promedioDeuda: stats.PromedioDeuda || 0,
        morososMasDe1Mes: stats.MorososMasDe1Mes || 0,
        morososMasDe3Meses: stats.MorososMasDe3Meses || 0,
        morososMasDe6Meses: stats.MorososMasDe6Meses || 0,
        distribucionRiesgo: distribucionResult.recordset,
        porMembresia: membresiasResult.recordset,
        evolucion: evolucionResult.recordset
      },
    })
  } catch (error) {
    console.error("Error al obtener reporte de morosidad:", error)
    return NextResponse.json(
      { error: "Error al obtener reporte de morosidad" },
      { status: 500 }
    )
  }
}
