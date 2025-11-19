import { type NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/sql-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = await getConnection();
    const arbitroId = params.id;

    const result = await pool
      .request()
      .input("arbitroId", sql.Int, Number.parseInt(arbitroId)).query(`
        SELECT 
          a.IdArbitro,
          p.Nombre + ' ' + ISNULL(p.Apellido, '') as Nombre,
          p.DNI,
          p.Mail as Email,
          p.Telefono,
          a.Estado,
          a.Tarifa,
          a.IdPersona
        FROM Arbitros a
        INNER JOIN Personas p ON a.IdPersona = p.IdPersona
        WHERE a.IdArbitro = @arbitroId
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Árbitro no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching arbitro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = await getConnection();
    const arbitroId = params.id;
    const body = await request.json();

    const { Estado } = body;

    // Validar que Estado sea 0 o 1
    if (Estado !== 0 && Estado !== 1) {
      return NextResponse.json(
        { error: "Estado inválido. Debe ser 0 (Inactivo) o 1 (Activo)" },
        { status: 400 }
      );
    }

    // Verificar que el árbitro existe
    const arbitroResult = await pool
      .request()
      .input("arbitroId", sql.Int, Number.parseInt(arbitroId))
      .query("SELECT IdArbitro FROM Arbitros WHERE IdArbitro = @arbitroId");

    if (arbitroResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Árbitro no encontrado" },
        { status: 404 }
      );
    }

    // Actualizar solo el Estado del árbitro
    await pool
      .request()
      .input("arbitroId", sql.Int, Number.parseInt(arbitroId))
      .input("estado", sql.Int, Estado).query(`
        UPDATE Arbitros
        SET Estado = @estado
        WHERE IdArbitro = @arbitroId
      `);

    return NextResponse.json({ message: "Árbitro actualizado correctamente" });
  } catch (error) {
    console.error("Error updating arbitro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
