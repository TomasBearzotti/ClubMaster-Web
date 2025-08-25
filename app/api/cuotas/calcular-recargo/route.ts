import { NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(req: Request) {
  try {
    const { cuotaId } = await req.json()

    if (!cuotaId) {
      return NextResponse.json({ error: "cuotaId es requerido" }, { status: 400 })
    }

    const pool = await getConnection()
    const result = await pool
      .request()
      .input("cuotaId", sql.Int, cuotaId)
      .query(`
        SELECT IdCuota, Monto, FechaVencimiento
        FROM Cuotas
        WHERE IdCuota = @cuotaId
      `)

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 })
    }

    const cuota = result.recordset[0]
    const hoy = new Date()
    const fechaVencimiento = new Date(cuota.FechaVencimiento)

    // Calcular meses vencidos
    let mesesVencidos = 0
    if (hoy > fechaVencimiento) {
      mesesVencidos =
        (hoy.getFullYear() - fechaVencimiento.getFullYear()) * 12 +
        (hoy.getMonth() - fechaVencimiento.getMonth())
    }

    // Recargo fijo por mes, ej: 10%
    const porcentajeRecargo = 0.1
    const montoRecargo = cuota.Monto * porcentajeRecargo * mesesVencidos
    const montoTotal = cuota.Monto + montoRecargo

    return NextResponse.json({
      cuotaId,
      montoOriginal: cuota.Monto,
      mesesVencidos,
      porcentajeRecargo,
      montoRecargo,
      montoTotal,
      fechaVencimiento: cuota.FechaVencimiento,
    })
  } catch (error) {
    console.error("Error en calcular-recargo:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
