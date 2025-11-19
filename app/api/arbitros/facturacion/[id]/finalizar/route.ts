import { NextResponse } from "next/server";
import { getConnection } from "@/lib/sql-server";
import sql from "mssql";

/**
 * POST /api/arbitros/facturacion/[id]/finalizar
 * Cambia el estado de una factura de Programada (0) a Pendiente (1)
 * Se debe llamar cuando el partido asociado ha finalizado
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const pool = await getConnection();
    const { id } = params;

    // Verificar que la factura existe
    const facturaResult = await pool
      .request()
      .input("idFactura", sql.Int, Number.parseInt(id))
      .query(`
        SELECT 
          fa.IdFactura,
          fa.Estado,
          fa.IdPartido,
          p.Estado as EstadoPartido
        FROM FacturacionArbitros fa
        INNER JOIN Partidos p ON fa.IdPartido = p.IdPartido
        WHERE fa.IdFactura = @idFactura
      `);

    if (facturaResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    const factura = facturaResult.recordset[0];

    // Validar que la factura está en estado Programada (0)
    if (factura.Estado !== 0) {
      const estadoNombre = 
        factura.Estado === 1 ? "Pendiente" :
        factura.Estado === 2 ? "Pagada" :
        "Cancelada";
      
      return NextResponse.json(
        { 
          error: `La factura ya está en estado ${estadoNombre}. Solo se pueden finalizar facturas en estado Programada.` 
        },
        { status: 400 }
      );
    }

    // Validar que el partido ha finalizado (Estado = 2)
    if (factura.EstadoPartido !== 2) {
      return NextResponse.json(
        { 
          error: "El partido asociado aún no ha finalizado. Finaliza el partido primero." 
        },
        { status: 400 }
      );
    }

    // Actualizar el estado de la factura a Pendiente (1)
    await pool
      .request()
      .input("idFactura", sql.Int, Number.parseInt(id))
      .query(`
        UPDATE FacturacionArbitros
        SET Estado = 1
        WHERE IdFactura = @idFactura
      `);

    // Obtener la factura actualizada con todos sus datos
    const facturaActualizadaResult = await pool
      .request()
      .input("idFactura", sql.Int, Number.parseInt(id))
      .query(`
        SELECT 
          fa.*,
          p.Nombre + ' ' + ISNULL(p.Apellido, '') as NombreArbitro,
          part.FechaPartido,
          part.HoraPartido,
          t.NombreTorneo
        FROM FacturacionArbitros fa
        INNER JOIN Arbitros a ON fa.IdArbitro = a.IdArbitro
        INNER JOIN Personas p ON a.IdPersona = p.IdPersona
        INNER JOIN Partidos part ON fa.IdPartido = part.IdPartido
        INNER JOIN Torneos t ON part.TorneoId = t.IdTorneo
        WHERE fa.IdFactura = @idFactura
      `);

    return NextResponse.json({
      success: true,
      message: "Factura marcada como Pendiente de pago",
      factura: facturaActualizadaResult.recordset[0],
    });

  } catch (error) {
    console.error("Error al finalizar factura:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
