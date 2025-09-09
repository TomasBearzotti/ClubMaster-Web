import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function POST(request: NextRequest) {
  try {
    const { cuotaId, metodoPago } = await request.json();

    if (!cuotaId || !metodoPago) {
      return NextResponse.json(
        { error: "ID de cuota y método de pago son requeridos" },
        { status: 400 }
      );
    }

    // Métodos permitidos para socios
    const metodosPermitidos = [
      "tarjeta_credito",
      "tarjeta_debito",
      "transferencia",
    ];
    if (!metodosPermitidos.includes(metodoPago)) {
      return NextResponse.json(
        { error: "Método de pago no permitido para socios" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // 🔎 Verificar cuota
    const cuotaCheck = await pool.request().input("cuotaId", sql.Int, cuotaId)
      .query(`
        SELECT c.Estado, c.Monto, c.FechaVencimiento, p.Nombre, p.Apellido
        FROM Cuotas c
        INNER JOIN Socios s ON c.SocioId = s.IdSocio
        INNER JOIN Personas p ON s.IdPersona = p.IdPersona
        WHERE c.IdCuota = @cuotaId
      `);

    if (cuotaCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: "Cuota no encontrada" },
        { status: 404 }
      );
    }

    const cuota = cuotaCheck.recordset[0];

    if (cuota.Estado === 1) {
      return NextResponse.json(
        { error: "La cuota ya ha sido pagada" },
        { status: 400 }
      );
    }

    // 🔎 Calcular recargo (10% mensual, tope 6 meses)
    const fechaVencimiento = new Date(cuota.FechaVencimiento);
    const fechaActual = new Date();
    let mesesVencidos =
      (fechaActual.getFullYear() - fechaVencimiento.getFullYear()) * 12 +
      (fechaActual.getMonth() - fechaVencimiento.getMonth());

    if (mesesVencidos < 0) mesesVencidos = 0;
    if (mesesVencidos > 6) mesesVencidos = 6;

    const recargo = cuota.Monto * (mesesVencidos * 0.1);

    // 🔎 Simulación de gateway
    const transaccionExitosa = Math.random() > 0.1; // 90% de éxito
    if (!transaccionExitosa) {
      return NextResponse.json(
        { error: "Error en el procesamiento del pago. Intenta nuevamente." },
        { status: 400 }
      );
    }

    const numeroTransaccion = `TXN-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 🔎 Actualizar cuota como pagada
    const result = await pool
      .request()
      .input("cuotaId", sql.Int, cuotaId)
      .input("fechaPago", sql.DateTime2, fechaActual)
      .input("recargo", sql.Decimal(10, 2), recargo)
      .input("metodoPago", sql.NVarChar, metodoPago)
      .input("numeroTransaccion", sql.NVarChar, numeroTransaccion).query(`
        UPDATE Cuotas
        SET Estado = 1,
            FechaPago = @fechaPago,
            Recargo = @recargo,
            MetodoPago = @metodoPago,
            NumeroTransaccion = @numeroTransaccion
        WHERE IdCuota = @cuotaId
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { error: "No se pudo procesar el pago" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pago procesado exitosamente",
      numeroTransaccion,
      socio: `${cuota.Nombre} ${cuota.Apellido}`,
      montoTotal: cuota.Monto + recargo,
      recargo,
      metodoPago,
    });
  } catch (error) {
    console.error("Error procesando pago online:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar pago" },
      { status: 500 }
    );
  }
}
