import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

/**
 * GET /api/arbitros/facturacion/[id]/comprobante
 * Genera y descarga el comprobante de pago de una factura en formato PDF o devuelve datos para el frontend
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const facturaId = Number.parseInt(params.id);

    if (isNaN(facturaId)) {
      return NextResponse.json(
        { error: "ID de factura inválido" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Obtener datos completos de la factura
    const result = await pool
      .request()
      .input("id", sql.Int, facturaId)
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
          CONCAT(pa.Nombre, ' ', pa.Apellido) as NombreArbitro,
          pa.Dni as DniArbitro,
          p.FechaPartido,
          p.HoraPartido,
          p.Lugar,
          t.Nombre as NombreTorneo,
          d.Nombre as NombreDeporte,
          ea.Nombre as EquipoA,
          eb.Nombre as EquipoB
        FROM FacturacionArbitros fa
        INNER JOIN Arbitros a ON fa.IdArbitro = a.IdArbitro
        INNER JOIN Personas pa ON a.IdPersona = pa.IdPersona
        INNER JOIN Partidos p ON fa.IdPartido = p.IdPartido
        INNER JOIN Torneos t ON p.TorneoId = t.IdTorneo
        INNER JOIN Deportes d ON t.IdDeporte = d.IdDeporte
        LEFT JOIN Participantes parta ON p.ParticipanteAId = parta.IdParticipante
        LEFT JOIN Equipos ea ON parta.EquipoId = ea.IdEquipo
        LEFT JOIN Participantes partb ON p.ParticipanteBId = partb.IdParticipante
        LEFT JOIN Equipos eb ON partb.EquipoId = eb.IdEquipo
        WHERE fa.IdFactura = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    const factura = result.recordset[0];

    // Verificar que la factura esté pagada
    if (factura.Estado !== 2) {
      return NextResponse.json(
        { error: "Solo se pueden descargar comprobantes de facturas pagadas" },
        { status: 400 }
      );
    }

    // Devolver los datos del comprobante
    return NextResponse.json({
      IdFactura: factura.IdFactura,
      NumeroComprobante: `FAC-${String(factura.IdFactura).padStart(6, '0')}`,
      FechaEmision: factura.FechaPago || factura.FechaCreacion,
      Arbitro: {
        Nombre: factura.NombreArbitro,
        Dni: factura.DniArbitro,
      },
      Partido: {
        Torneo: factura.NombreTorneo,
        Deporte: factura.NombreDeporte,
        Fecha: factura.FechaPartido,
        Hora: factura.HoraPartido,
        Lugar: factura.Lugar,
        Equipos: `${factura.EquipoA || 'TBD'} vs ${factura.EquipoB || 'TBD'}`,
      },
      Monto: factura.Monto,
      MetodoPago: factura.MetodoPago || 'Efectivo',
      Estado: 'Pagada',
    });
  } catch (error) {
    console.error("Error generando comprobante:", error);
    return NextResponse.json(
      { error: "Error interno al generar comprobante" },
      { status: 500 }
    );
  }
}
