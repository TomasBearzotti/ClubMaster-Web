import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(request: NextRequest) {
  try {
    const { cuotaId, metodoPago, datosTransaccion } = await request.json()

    if (!cuotaId || !metodoPago) {
      return NextResponse.json({ error: "ID de cuota y método de pago son requeridos" }, { status: 400 })
    }

    // Validar que el método de pago sea válido para socios
    const metodosPermitidos = ["tarjeta_credito", "tarjeta_debito", "transferencia"]
    if (!metodosPermitidos.includes(metodoPago)) {
      return NextResponse.json({ error: "Método de pago no permitido para socios" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar si la cuota existe y está pendiente
    const cuotaCheck = await pool
      .request()
      .input("cuotaId", sql.Int, cuotaId)
      .query(`
        SELECT c.Estado, c.Monto, c.FechaVencimiento, s.Nombre
        FROM Cuotas c
        INNER JOIN Socios s ON c.SocioId = s.IdSocio
        WHERE c.IdCuota = @cuotaId
      `)

    if (cuotaCheck.recordset.length === 0) {
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 })
    }

    if (cuotaCheck.recordset[0].Estado === 1) {
      return NextResponse.json({ error: "La cuota ya ha sido pagada" }, { status: 400 })
    }

    // Calcular recargo si aplica
    const fechaVencimiento = new Date(cuotaCheck.recordset[0].FechaVencimiento)
    const fechaActual = new Date()
    const mesesVencidos = Math.max(
      0,
      Math.floor((fechaActual.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    )
    const recargo = cuotaCheck.recordset[0].Monto * (mesesVencidos * 0.1)

    // Simular procesamiento de pago (en producción aquí iría la integración con el gateway de pago)
    const transaccionExitosa = Math.random() > 0.1 // 90% de éxito

    if (!transaccionExitosa) {
      return NextResponse.json({ error: "Error en el procesamiento del pago. Intenta nuevamente." }, { status: 400 })
    }

    // Registrar el pago
    const numeroTransaccion = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const result = await pool
      .request()
      .input("cuotaId", sql.Int, cuotaId)
      .input("fechaPago", sql.DateTime2, fechaActual)
      .input("recargo", sql.Decimal(10, 2), recargo)
      .input("metodoPago", sql.NVarChar, metodoPago)
      .input("numeroTransaccion", sql.NVarChar, numeroTransaccion)
      .query(`
        UPDATE Cuotas
        SET Estado = 1, 
            FechaPago = @fechaPago, 
            Recargo = @recargo,
            MetodoPago = @metodoPago,
            NumeroTransaccion = @numeroTransaccion
        WHERE IdCuota = @cuotaId
      `)

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "No se pudo procesar el pago" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Pago procesado exitosamente",
      numeroTransaccion,
      montoTotal: cuotaCheck.recordset[0].Monto + recargo,
      recargo,
      metodoPago,
    })
  } catch (error) {
    console.error("Error procesando pago online:", error)
    return NextResponse.json({ error: "Error interno del servidor al procesar pago" }, { status: 500 })
  }
}
