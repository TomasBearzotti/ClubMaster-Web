import { type NextRequest, NextResponse } from "next/server"
import { getConnection, sql } from "@/lib/sql-server"

export async function POST(request: NextRequest) {
  try {
    const { cuotaId, fechaPago, recargo } = await request.json()

    if (!cuotaId || !fechaPago) {
      return NextResponse.json({ error: "ID de cuota y fecha de pago son requeridos" }, { status: 400 })
    }

    const pool = await getConnection()

    // Verificar si la cuota existe y está pendiente
    const cuotaCheck = await pool
      .request()
      .input("cuotaId", sql.Int, cuotaId)
      .query("SELECT Estado FROM Cuotas WHERE IdCuota = @cuotaId")

    if (cuotaCheck.recordset.length === 0) {
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 })
    }
    if (cuotaCheck.recordset[0].Estado === 1) {
      return NextResponse.json({ error: "La cuota ya ha sido pagada" }, { status: 400 })
    }

    const result = await pool
      .request()
      .input("cuotaId", sql.Int, cuotaId)
      .input("fechaPago", sql.DateTime2, new Date(fechaPago))
      .input("recargo", sql.Decimal(10, 2), recargo || 0)
      .query(`
        UPDATE Cuotas
        SET Estado = 1, FechaPago = @fechaPago, Recargo = @recargo
        WHERE IdCuota = @cuotaId
      `)

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "No se pudo registrar el pago de la cuota" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Pago registrado exitosamente" })
  } catch (error) {
    console.error("Error registrando pago:", error)
    return NextResponse.json({ error: "Error interno del servidor al registrar pago" }, { status: 500 })
  }
}
