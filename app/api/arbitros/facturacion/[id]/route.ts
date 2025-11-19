import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

// GET - Obtener detalle de una factura específica
export async function GET(
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

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          fa.IdFactura,
          fa.IdArbitro,
          fa.IdPartido,
          fa.Monto,
          fa.Estado,
          fa.FechaCreacion,
          fa.FechaPago,
          fa.MetodoPago,
          p.Nombre + ' ' + ISNULL(p.Apellido, '') as NombreArbitro,
          p.Mail as EmailArbitro,
          p.Telefono as TelefonoArbitro,
          pa.FechaPartido,
          pa.HoraPartido,
          pa.Lugar,
          pa.EstadoPartido,
          t.Nombre as NombreTorneo
        FROM FacturacionArbitros fa
        INNER JOIN Arbitros a ON fa.IdArbitro = a.IdArbitro
        INNER JOIN Personas p ON a.IdPersona = p.IdPersona
        INNER JOIN Partidos pa ON fa.IdPartido = pa.IdPartido
        INNER JOIN Torneos t ON pa.TorneoId = t.IdTorneo
        WHERE fa.IdFactura = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching factura:", error);
    return NextResponse.json(
      { error: "Error al obtener factura" },
      { status: 500 }
    );
  }
}

// DELETE - Cancelar factura
export async function DELETE(
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

    const pool = await getConnection();

    // Verificar que la factura existe y no está pagada
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
        { error: "No se puede cancelar una factura ya pagada" },
        { status: 400 }
      );
    }

    // Cambiar estado a Cancelada (3)
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("UPDATE FacturacionArbitros SET Estado = 3 WHERE IdFactura = @id");

    return NextResponse.json({
      success: true,
      message: "Factura cancelada exitosamente",
    });
  } catch (error) {
    console.error("Error canceling factura:", error);
    return NextResponse.json(
      { error: "Error al cancelar factura" },
      { status: 500 }
    );
  }
}
