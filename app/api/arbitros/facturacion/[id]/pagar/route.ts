import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

// POST - Registrar pago de factura
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "ID de factura inválido" },
        { status: 400 }
      );
    }

    const { metodoPago } = await request.json();

    if (!metodoPago) {
      return NextResponse.json(
        { error: "Método de pago es requerido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verificar que la factura existe y está en estado Pendiente (1)
    const checkResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT Estado FROM FacturacionArbitros WHERE IdFactura = @id");

    if (checkResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    const estado = checkResult.recordset[0].Estado;

    if (estado === 2) {
      return NextResponse.json(
        { error: "Esta factura ya fue pagada" },
        { status: 400 }
      );
    }

    if (estado === 3) {
      return NextResponse.json(
        { error: "No se puede pagar una factura cancelada" },
        { status: 400 }
      );
    }

    if (estado === 0) {
      return NextResponse.json(
        { error: "No se puede pagar una factura en estado Programada. El partido debe estar finalizado." },
        { status: 400 }
      );
    }

    // Registrar pago: cambiar estado a Pagada (2)
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("metodoPago", sql.NVarChar, metodoPago)
      .query(`
        UPDATE FacturacionArbitros 
        SET Estado = 2, 
            FechaPago = GETDATE(),
            MetodoPago = @metodoPago
        WHERE IdFactura = @id
      `);

    return NextResponse.json({
      success: true,
      message: "Pago registrado exitosamente",
      idFactura: id,
    });
  } catch (error) {
    console.error("Error registering payment:", error);
    return NextResponse.json(
      { error: "Error al registrar pago" },
      { status: 500 }
    );
  }
}
