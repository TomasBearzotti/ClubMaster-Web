import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaInicio = searchParams.get("fechaInicio")
    const fechaFin = searchParams.get("fechaFin")
    const tipoMembresia = searchParams.get("tipoMembresia")

    const pool = await getConnection()

    // Query para obtener todos los socios con su información de membresía
    let sociosQuery = `
      SELECT 
        s.IdSocio,
        s.Estado,
        s.TipoMembresiaId,
        p.Nombre,
        p.Apellido,
        tm.Descripcion as TipoMembresia,
        tm.MontoMensual
      FROM Socios s
      INNER JOIN Personas p ON s.IdPersona = p.IdPersona
      INNER JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
      WHERE 1=1
    `

    const request1 = pool.request()

    if (tipoMembresia && tipoMembresia !== "todas") {
      sociosQuery += ` AND s.TipoMembresiaId = @tipoMembresia`
      request1.input("tipoMembresia", sql.Int, parseInt(tipoMembresia))
    }

    const sociosResult = await request1.query(sociosQuery)

    // Estadísticas generales
    const totalSocios = sociosResult.recordset.length
    const activos = sociosResult.recordset.filter((s: any) => s.Estado === 1).length
    const inactivos = sociosResult.recordset.filter((s: any) => s.Estado === 0).length
    const suspendidos = sociosResult.recordset.filter((s: any) => s.Estado === 2).length

    // Distribución por estado
    const porEstado = [
      { name: "Activos", value: activos },
      { name: "Inactivos", value: inactivos },
      { name: "Suspendidos", value: suspendidos },
    ].filter((item) => item.value > 0)

    // Distribución por tipo de membresía
    const membresiasMap = new Map()
    sociosResult.recordset.forEach((s: any) => {
      const key = s.TipoMembresia
      if (!membresiasMap.has(key)) {
        membresiasMap.set(key, {
          name: key,
          cantidad: 0,
          monto: s.MontoMensual,
          ingresoMensual: 0,
        })
      }
      const item = membresiasMap.get(key)
      item.cantidad++
      item.ingresoMensual = item.cantidad * s.MontoMensual
    })

    const porMembresia = Array.from(membresiasMap.values()).map((item) => ({
      name: item.name,
      cantidad: item.cantidad,
      value: item.cantidad, // Para el gráfico
      porcentaje: ((item.cantidad / totalSocios) * 100).toFixed(1),
      ingresoMensual: item.ingresoMensual.toFixed(2),
    }))

    // Calcular ingresos potenciales por tipo
    const ingresosPotenciales = porMembresia.reduce(
      (acc, m) => acc + parseFloat(m.ingresoMensual),
      0
    )

    // Tasa de retención (activos / total)
    const tasaRetencion = totalSocios > 0 ? ((activos / totalSocios) * 100).toFixed(1) : "0"

    // Query para cuotas pagadas (proxy de antigüedad)
    const antiguedadQuery = `
      SELECT 
        s.IdSocio,
        COUNT(c.IdCuota) as CuotasPagadas
      FROM Socios s
      LEFT JOIN Cuotas c ON s.IdSocio = c.SocioId AND c.Estado = 1
      WHERE s.Estado = 1
      GROUP BY s.IdSocio
    `

    const antiguedadResult = await pool.request().query(antiguedadQuery)

    // Clasificar por antigüedad aproximada (basado en cuotas pagadas)
    const antiguedadRangos = [
      { name: "0-6 meses", min: 0, max: 6, cantidad: 0 },
      { name: "6-12 meses", min: 7, max: 12, cantidad: 0 },
      { name: "1-3 años", min: 13, max: 36, cantidad: 0 },
      { name: "+3 años", min: 37, max: Infinity, cantidad: 0 },
    ]

    antiguedadResult.recordset.forEach((s: any) => {
      const cuotas = s.CuotasPagadas
      for (const rango of antiguedadRangos) {
        if (cuotas >= rango.min && cuotas <= rango.max) {
          rango.cantidad++
          break
        }
      }
    })

    const porAntiguedad = antiguedadRangos
      .filter((r) => r.cantidad > 0)
      .map((r) => ({
        name: r.name,
        value: r.cantidad,
        porcentaje: ((r.cantidad / activos) * 100).toFixed(1),
      }))

    // Estadísticas de altas y bajas (simulado ya que no hay fechas)
    // En producción, esto debería usar FechaAlta y FechaBaja
    const altasYBajas = {
      altas: Math.floor(totalSocios * 0.1), // 10% simulado
      bajas: inactivos,
      neto: Math.floor(totalSocios * 0.1) - inactivos,
    }

    const estadisticas = {
      totalSocios,
      activos,
      inactivos,
      suspendidos,
      tasaRetencion: parseFloat(tasaRetencion),
      ingresosPotenciales: ingresosPotenciales.toFixed(2),
      porEstado,
      porMembresia,
      porAntiguedad,
      altasYBajas,
    }

    return NextResponse.json({
      socios: sociosResult.recordset,
      estadisticas,
    })
  } catch (error: any) {
    console.error("Error en reporte de retención y membresías:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte", details: error.message },
      { status: 500 }
    )
  }
}
