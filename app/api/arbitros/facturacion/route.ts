import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

// GET - Obtener todas las facturas de árbitros con filtros opcionales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado"); // 0: Programada, 1: Pendiente, 2: Pagada, 3: Cancelada
    const arbitroId = searchParams.get("arbitroId");

    const pool = await getConnection();
    let query = `
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
        pa.FechaPartido,
        pa.HoraPartido,
        pa.Lugar,
        t.Nombre as NombreTorneo
      FROM FacturacionArbitros fa
      INNER JOIN Arbitros a ON fa.IdArbitro = a.IdArbitro
      INNER JOIN Personas p ON a.IdPersona = p.IdPersona
      INNER JOIN Partidos pa ON fa.IdPartido = pa.IdPartido
      INNER JOIN Torneos t ON pa.TorneoId = t.IdTorneo
      WHERE 1=1
    `;

    const requestParams = pool.request();

    // Filtro por estado
    if (estado !== null && estado !== undefined) {
      query += ` AND fa.Estado = @estado`;
      requestParams.input("estado", sql.Int, parseInt(estado));
    }

    // Filtro por árbitro
    if (arbitroId) {
      query += ` AND fa.IdArbitro = @arbitroId`;
      requestParams.input("arbitroId", sql.Int, parseInt(arbitroId));
    }

    query += ` ORDER BY fa.FechaCreacion DESC`;

    const result = await requestParams.query(query);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error fetching facturacion arbitros:", error);
    return NextResponse.json(
      { error: "Error al obtener facturas de árbitros" },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva factura (cuando se asigna árbitro a partido)
export async function POST(request: NextRequest) {
  try {
    const { idArbitro, idPartido, monto } = await request.json();

    if (!idArbitro || !idPartido || !monto) {
      return NextResponse.json(
        { error: "IdArbitro, IdPartido y Monto son requeridos" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verificar que no exista ya una factura para este partido
    const existingCheck = await pool
      .request()
      .input("idPartido", sql.Int, idPartido)
      .query(
        "SELECT COUNT(*) as count FROM FacturacionArbitros WHERE IdPartido = @idPartido"
      );

    if (existingCheck.recordset[0].count > 0) {
      return NextResponse.json(
        { error: "Ya existe una factura para este partido" },
        { status: 400 }
      );
    }

    // Crear la factura en estado Programada (0)
    const result = await pool
      .request()
      .input("idArbitro", sql.Int, idArbitro)
      .input("idPartido", sql.Int, idPartido)
      .input("monto", sql.Decimal(10, 2), monto)
      .query(`
        INSERT INTO FacturacionArbitros (IdArbitro, IdPartido, Monto, Estado, FechaCreacion)
        OUTPUT INSERTED.IdFactura
        VALUES (@idArbitro, @idPartido, @monto, 0, GETDATE())
      `);

    const idFactura = result.recordset[0].IdFactura;

    return NextResponse.json({
      success: true,
      idFactura,
      message: "Factura creada exitosamente en estado Programada",
    });
  } catch (error) {
    console.error("Error creating factura:", error);
    return NextResponse.json(
      { error: "Error al crear factura de árbitro" },
      { status: 500 }
    );
  }
}
