import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(request: NextRequest) {
  try {
    const { mes, anio, socioIds } = await request.json()

    if (!mes || !anio || !socioIds || !Array.isArray(socioIds) || socioIds.length === 0) {
      return NextResponse.json(
        { error: "Datos requeridos faltantes: mes, año y al menos un socioId." },
        { status: 400 },
      )
    }

    const pool = await getConnection()

    // Verificar si ya existen cuotas para este período para ALGUNOS de los socios seleccionados
    const checkRequest = pool.request()
    const socioIdParams = socioIds
      .map((id: number, index: number) => {
        checkRequest.input(`socioId${index}`, sql.Int, id)
        return `@socioId${index}`
      })
      .join(",")

    const existingResult = await checkRequest
      .input("mes", sql.Int, mes)
      .input("anio", sql.Int, anio)
      .query(`
        SELECT s.Nombre, c.Mes, c.Anio
        FROM Cuotas c
        INNER JOIN Socios s ON c.SocioId = s.IdSocio
        WHERE c.Mes = @mes AND c.Anio = @anio AND c.SocioId IN (${socioIdParams})
      `)

    if (existingResult.recordset.length > 0) {
      const existingSocios = existingResult.recordset.map((r) => r.Nombre).join(", ")
      return NextResponse.json(
        { error: `Ya existen cuotas generadas para el período ${mes}/${anio} para los socios: ${existingSocios}.` },
        { status: 400 },
      )
    }

    // Obtener información de los socios seleccionados y sus tipos de membresía
    const sociosRequest = pool.request()
    const selectedSocioIdParams = socioIds
      .map((id: number, index: number) => {
        sociosRequest.input(`socioId${index}`, sql.Int, id)
        return `@socioId${index}`
      })
      .join(",")

    const sociosResult = await sociosRequest.query(`
      SELECT s.IdSocio, s.Nombre, tm.MontoMensual
      FROM Socios s
      INNER JOIN TiposMembresia tm ON s.TipoMembresiaId = tm.IdTipo
      WHERE s.IdSocio IN (${selectedSocioIdParams}) AND s.Estado = 1
    `)

    // Calcular fecha de vencimiento (último día del mes)
    // El mes en JavaScript Date es 0-indexado, por eso mes - 1. El día 0 del mes siguiente da el último día del mes actual.
    const fechaVencimiento = new Date(anio, mes, 0)

    let cuotasGeneradas = 0
    let montoTotalGenerado = 0

    // Generar cuotas para cada socio
    for (const socio of sociosResult.recordset) {
      await pool
        .request()
        .input("mes", sql.Int, mes)
        .input("anio", sql.Int, anio)
        .input("monto", sql.Decimal(10, 2), socio.MontoMensual)
        .input("estado", sql.Int, 0) // 0 = Pendiente
        .input("fechaVencimiento", sql.DateTime2, fechaVencimiento)
        .input("socioId", sql.Int, socio.IdSocio)
        .query(`
          INSERT INTO Cuotas (Mes, Anio, Monto, Estado, FechaVencimiento, SocioId)
          VALUES (@mes, @anio, @monto, @estado, @fechaVencimiento, @socioId)
        `)

      cuotasGeneradas++
      montoTotalGenerado += Number.parseFloat(socio.MontoMensual)
    }

    return NextResponse.json({
      success: true,
      message: `Se generaron ${cuotasGeneradas} cuotas exitosamente por un total de ${montoTotalGenerado.toFixed(2)}.`,
      cuotasGeneradas,
      montoTotalGenerado,
    })
  } catch (error) {
    console.error("Error generando cuotas:", error)
    return NextResponse.json({ error: "Error interno del servidor al generar cuotas." }, { status: 500 })
  }
}
