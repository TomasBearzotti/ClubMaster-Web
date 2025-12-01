import { NextRequest, NextResponse } from "next/server"
import { getConnection } from "@/lib/sql-server"
import sql from "mssql"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodo1Inicio = searchParams.get("periodo1Inicio")
    const periodo1Fin = searchParams.get("periodo1Fin")
    const periodo2Inicio = searchParams.get("periodo2Inicio")
    const periodo2Fin = searchParams.get("periodo2Fin")

    if (!periodo1Inicio || !periodo1Fin || !periodo2Inicio || !periodo2Fin) {
      return NextResponse.json(
        { error: "Se requieren ambos períodos para la comparación" },
        { status: 400 }
      )
    }

    const pool = await getConnection()

    // ========== MÉTRICAS PERÍODO 1 ==========
    const request1 = pool.request()
    request1.input("inicio", sql.Date, new Date(periodo1Inicio))
    request1.input("fin", sql.Date, new Date(periodo1Fin))

    const metricas1Query = `
      -- Socios
      SELECT 
        (SELECT COUNT(*) FROM Socios s INNER JOIN Personas p ON s.IdPersona = p.IdPersona WHERE p.FechaRegistro BETWEEN @inicio AND @fin) as NuevosSocios,
        (SELECT COUNT(*) FROM Socios WHERE Estado = 1) as SociosActivos,
        
        -- Cuotas
        (SELECT COUNT(*) FROM Cuotas WHERE FechaPago BETWEEN @inicio AND @fin AND Estado = 1) as CuotasPagadas,
        (SELECT ISNULL(SUM(Monto), 0) FROM Cuotas WHERE FechaPago BETWEEN @inicio AND @fin AND Estado = 1) as IngresosCuotas,
        
        -- Torneos
        (SELECT COUNT(*) FROM Torneos WHERE FechaInicio BETWEEN @inicio AND @fin) as TorneosCreados,
        (SELECT COUNT(*) FROM Torneos WHERE Estado = 1 AND FechaInicio <= @fin) as TorneosActivos,
        
        -- Partidos
        (SELECT COUNT(*) FROM Partidos WHERE FechaPartido BETWEEN @inicio AND @fin) as PartidosJugados,
        (SELECT COUNT(*) FROM Partidos WHERE FechaPartido BETWEEN @inicio AND @fin AND EstadoPartido = 'Finalizado') as PartidosFinalizados,
        
        -- Equipos
        (SELECT COUNT(*) FROM Equipos WHERE FechaCreacion BETWEEN @inicio AND @fin) as EquiposCreados,
        
        -- Árbitros
        (SELECT COUNT(DISTINCT ArbitroId) FROM Partidos WHERE FechaPartido BETWEEN @inicio AND @fin) as ArbitrosActivos,
        (SELECT ISNULL(SUM(ISNULL(a.Tarifa, 50000)), 0) 
         FROM Partidos p 
         INNER JOIN Arbitros a ON p.ArbitroId = a.IdArbitro 
         WHERE p.FechaPartido BETWEEN @inicio AND @fin AND p.EstadoPartido = 'Finalizado') as GastosArbitros
    `

    const metricas1Result = await request1.query(metricas1Query)

    // ========== MÉTRICAS PERÍODO 2 ==========
    const request2 = pool.request()
    request2.input("inicio", sql.Date, new Date(periodo2Inicio))
    request2.input("fin", sql.Date, new Date(periodo2Fin))

    const metricas2Result = await request2.query(metricas1Query)

    // ========== PROCESAR DATOS ==========
    const periodo1 = metricas1Result.recordset[0] || {}
    const periodo2 = metricas2Result.recordset[0] || {}

    // Función para determinar el nombre del período
    const getNombrePeriodo = (inicio: string, fin: string): string => {
      const fechaInicio = new Date(inicio)
      const fechaFin = new Date(fin)
      const diffDias = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24))
      
      const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                     "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
      
      const mesInicio = fechaInicio.getMonth()
      const mesFin = fechaFin.getMonth()
      const anioInicio = fechaInicio.getFullYear()
      const anioFin = fechaFin.getFullYear()
      
      // Período mensual (28-31 días)
      if (diffDias >= 28 && diffDias <= 31 && mesInicio === mesFin) {
        return `${meses[mesInicio]} ${anioInicio}`
      }
      
      // Período trimestral (~90 días)
      if (diffDias >= 85 && diffDias <= 95) {
        const trimestre = Math.floor(mesInicio / 3) + 1
        return `Q${trimestre} ${anioInicio}`
      }
      
      // Período semestral (~180 días)
      if (diffDias >= 175 && diffDias <= 185) {
        const semestre = mesInicio < 6 ? 1 : 2
        return `Semestre ${semestre} ${anioInicio}`
      }
      
      // Período anual (~365 días)
      if (diffDias >= 360 && diffDias <= 370 && anioInicio === anioFin) {
        return `Año ${anioInicio}`
      }
      
      // Período personalizado
      if (anioInicio === anioFin) {
        return `${fechaInicio.getDate()}/${mesInicio + 1} - ${fechaFin.getDate()}/${mesFin + 1}/${anioFin}`
      } else {
        return `${fechaInicio.getDate()}/${mesInicio + 1}/${anioInicio} - ${fechaFin.getDate()}/${mesFin + 1}/${anioFin}`
      }
    }

    const nombrePeriodo1 = getNombrePeriodo(periodo1Inicio, periodo1Fin)
    const nombrePeriodo2 = getNombrePeriodo(periodo2Inicio, periodo2Fin)

    // Calcular variaciones porcentuales
    const calcularVariacion = (valor1: number, valor2: number) => {
      if (valor1 === 0) return valor2 > 0 ? 100 : 0
      return ((valor2 - valor1) / valor1) * 100
    }

    const comparacion = [
      {
        metrica: "Nuevos Socios",
        periodo1: periodo1.NuevosSocios || 0,
        periodo2: periodo2.NuevosSocios || 0,
        variacion: calcularVariacion(periodo1.NuevosSocios || 0, periodo2.NuevosSocios || 0),
        categoria: "Socios"
      },
      {
        metrica: "Socios Activos",
        periodo1: periodo1.SociosActivos || 0,
        periodo2: periodo2.SociosActivos || 0,
        variacion: calcularVariacion(periodo1.SociosActivos || 0, periodo2.SociosActivos || 0),
        categoria: "Socios"
      },
      {
        metrica: "Cuotas Pagadas",
        periodo1: periodo1.CuotasPagadas || 0,
        periodo2: periodo2.CuotasPagadas || 0,
        variacion: calcularVariacion(periodo1.CuotasPagadas || 0, periodo2.CuotasPagadas || 0),
        categoria: "Finanzas"
      },
      {
        metrica: "Ingresos por Cuotas",
        periodo1: periodo1.IngresosCuotas || 0,
        periodo2: periodo2.IngresosCuotas || 0,
        variacion: calcularVariacion(periodo1.IngresosCuotas || 0, periodo2.IngresosCuotas || 0),
        categoria: "Finanzas",
        formato: "moneda"
      },
      {
        metrica: "Gastos Árbitros",
        periodo1: periodo1.GastosArbitros || 0,
        periodo2: periodo2.GastosArbitros || 0,
        variacion: calcularVariacion(periodo1.GastosArbitros || 0, periodo2.GastosArbitros || 0),
        categoria: "Finanzas",
        formato: "moneda"
      },
      {
        metrica: "Balance Neto",
        periodo1: (periodo1.IngresosCuotas || 0) - (periodo1.GastosArbitros || 0),
        periodo2: (periodo2.IngresosCuotas || 0) - (periodo2.GastosArbitros || 0),
        variacion: calcularVariacion(
          (periodo1.IngresosCuotas || 0) - (periodo1.GastosArbitros || 0),
          (periodo2.IngresosCuotas || 0) - (periodo2.GastosArbitros || 0)
        ),
        categoria: "Finanzas",
        formato: "moneda"
      },
      {
        metrica: "Torneos Creados",
        periodo1: periodo1.TorneosCreados || 0,
        periodo2: periodo2.TorneosCreados || 0,
        variacion: calcularVariacion(periodo1.TorneosCreados || 0, periodo2.TorneosCreados || 0),
        categoria: "Deportes"
      },
      {
        metrica: "Torneos Activos",
        periodo1: periodo1.TorneosActivos || 0,
        periodo2: periodo2.TorneosActivos || 0,
        variacion: calcularVariacion(periodo1.TorneosActivos || 0, periodo2.TorneosActivos || 0),
        categoria: "Deportes"
      },
      {
        metrica: "Partidos Jugados",
        periodo1: periodo1.PartidosJugados || 0,
        periodo2: periodo2.PartidosJugados || 0,
        variacion: calcularVariacion(periodo1.PartidosJugados || 0, periodo2.PartidosJugados || 0),
        categoria: "Deportes"
      },
      {
        metrica: "Partidos Finalizados",
        periodo1: periodo1.PartidosFinalizados || 0,
        periodo2: periodo2.PartidosFinalizados || 0,
        variacion: calcularVariacion(periodo1.PartidosFinalizados || 0, periodo2.PartidosFinalizados || 0),
        categoria: "Deportes"
      },
      {
        metrica: "Equipos Creados",
        periodo1: periodo1.EquiposCreados || 0,
        periodo2: periodo2.EquiposCreados || 0,
        variacion: calcularVariacion(periodo1.EquiposCreados || 0, periodo2.EquiposCreados || 0),
        categoria: "Deportes"
      },
      {
        metrica: "Árbitros Activos",
        periodo1: periodo1.ArbitrosActivos || 0,
        periodo2: periodo2.ArbitrosActivos || 0,
        variacion: calcularVariacion(periodo1.ArbitrosActivos || 0, periodo2.ArbitrosActivos || 0),
        categoria: "Deportes"
      }
    ]

    // Datos para gráficos comparativos
    const comparacionGrafico = comparacion.map(item => ({
      name: item.metrica,
      Periodo1: item.periodo1,
      Periodo2: item.periodo2,
      categoria: item.categoria
    }))

    // Agrupar por categoría
    const porCategoria = comparacion.reduce((acc: any, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = []
      }
      acc[item.categoria].push(item)
      return acc
    }, {})

    const estadisticas = {
      periodo1Nombre: nombrePeriodo1,
      periodo2Nombre: nombrePeriodo2,
      periodo1Fechas: `${periodo1Inicio} a ${periodo1Fin}`,
      periodo2Fechas: `${periodo2Inicio} a ${periodo2Fin}`,
      comparacionGrafico,
      porCategoria,
      resumen: {
        mejorasSignificativas: comparacion.filter(c => c.variacion > 10).length,
        disminuciones: comparacion.filter(c => c.variacion < -10).length,
        estables: comparacion.filter(c => c.variacion >= -10 && c.variacion <= 10).length,
      }
    }

    return NextResponse.json({
      comparacion,
      estadisticas,
    })
  } catch (error: any) {
    console.error("Error en reporte comparativo de períodos:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte", details: error.message },
      { status: 500 }
    )
  }
}
